/**
 * Transaction risk-scoring engine (PROMPT MASTER — risk scoring + ML-ready).
 *
 * Produces a 0–100 risk score for a booking from three signal families:
 *   1. amount anomaly  — DP vs this customer's own spend history
 *   2. frequency       — how many bookings the account made very recently
 *   3. user history    — account age, failed/refunded payments, prior flags
 *
 * Design choices (consistent with lib/fraud — "flag, an admin decides"):
 *   - The engine ADVISES. By default it never hard-blocks; the caller decides.
 *     A configurable `RISK_BLOCK_THRESHOLD` enables hard-blocking for the truly
 *     extreme, so a single tunable can tighten policy without code changes.
 *   - HIGH-band scores write a dedup'd FraudFlag for ops review.
 *   - Every assessment logs a FLAT NUMERIC FEATURE VECTOR (`risk.scored`). These
 *     log lines are the training dataset: ship them to a warehouse, join the
 *     eventual label (chargeback / refund-abuse / good), and you have supervised
 *     data with zero extra instrumentation. `modelVersion` lets you bucket rows
 *     by scorer version once a real ML model replaces these heuristics.
 *   - Fully fault-tolerant: any DB error degrades to a neutral LOW assessment so
 *     risk scoring can NEVER block a legitimate booking.
 */

import prisma from './prisma';
import { logEvent } from './logger';

/** Bump when the feature set or scoring logic changes (dataset versioning). */
export const RISK_MODEL_VERSION = 'heuristic-v1';

export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH';

/** Band cutoffs on the 0–100 score. */
export const RISK_BANDS = { medium: 40, high: 70 } as const;

/**
 * Score at/above which the caller SHOULD hard-block (vs merely flag). Read from
 * env so policy is tunable in prod; defaults to 101 = never block (flag only).
 */
export function riskBlockThreshold(): number {
  const raw = Number(process.env.RISK_BLOCK_THRESHOLD);
  return Number.isFinite(raw) && raw > 0 ? raw : 101;
}

/** Tunable points each signal contributes (documented, ML will replace these). */
export const RISK_WEIGHTS = {
  brandNewAccount: 20, // age < 24h
  freshAccount: 10, // age < 1h (on top of brandNewAccount)
  amountSpike3x: 25, // DP > 3× historical average
  amountSpike5x: 10, // additional, DP > 5× average
  newUserHighAmount: 20, // no history + large DP
  burst1h: 25, // >= BURST_1H bookings in the last hour
  busy24h: 15, // >= BUSY_24H bookings in the last 24h
  manyFailed: 15, // >= 3 failed/expired payments
  manyRefunded: 20, // >= 2 refunded payments
  priorFlag: 25, // any prior FraudFlag on the account
} as const;

/** Signal thresholds. */
export const NEW_USER_HIGH_AMOUNT = 1_000_000; // Rp 1jt DP from a no-history user
export const BURST_1H = 3;
export const BUSY_24H = 8;

/** Flat, all-numeric feature vector — one row of the ML dataset. */
export interface RiskFeatures {
  currentAmount: number;
  currentSubtotal: number;
  accountAgeHours: number;
  bookingsLast1h: number;
  bookingsLast24h: number;
  paidCount: number;
  failedCount: number;
  refundedCount: number;
  avgPaidAmount: number;
  maxPaidAmount: number;
  amountToAvgRatio: number; // currentAmount / avgPaidAmount (0 when no history)
  priorFraudFlags: number;
}

export interface RiskAssessment {
  score: number; // 0–100
  band: RiskBand;
  /** Human-readable reasons for the score (Bahasa Indonesia). */
  reasons: string[];
  features: RiskFeatures;
  modelVersion: string;
  /** True when score >= riskBlockThreshold() — caller may reject the booking. */
  shouldBlock: boolean;
}

export interface RiskInput {
  customerId: string;
  /** DP being charged now (Rupiah). */
  amount: number;
  /** Total job value (Rupiah). */
  subtotal: number;
}

const HOUR_MS = 3_600_000;

function bandFor(score: number): RiskBand {
  if (score >= RISK_BANDS.high) return 'HIGH';
  if (score >= RISK_BANDS.medium) return 'MEDIUM';
  return 'LOW';
}

/** Gather all signals from the DB in parallel. */
async function gatherFeatures(input: RiskInput): Promise<RiskFeatures> {
  const now = Date.now();
  const [user, bookings1h, bookings24h, paid, failedCount, refundedCount, priorFraudFlags] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: input.customerId }, select: { createdAt: true } }),
      prisma.job.count({
        where: { customerId: input.customerId, createdAt: { gte: new Date(now - HOUR_MS) } },
      }),
      prisma.job.count({
        where: { customerId: input.customerId, createdAt: { gte: new Date(now - 24 * HOUR_MS) } },
      }),
      prisma.payment.findMany({
        where: { customerId: input.customerId, status: { in: ['PAID', 'HELD', 'RELEASED'] } },
        select: { amount: true },
      }),
      prisma.payment.count({
        where: { customerId: input.customerId, status: { in: ['FAILED', 'EXPIRED'] } },
      }),
      prisma.payment.count({
        where: {
          customerId: input.customerId,
          status: { in: ['REFUNDED', 'REFUND_REQUESTED', 'DISPUTED'] },
        },
      }),
      prisma.fraudFlag.count({ where: { userId: input.customerId } }),
    ]);

  const paidAmounts = paid.map((p) => p.amount);
  const paidCount = paidAmounts.length;
  const avgPaidAmount = paidCount > 0 ? Math.round(paidAmounts.reduce((a, b) => a + b, 0) / paidCount) : 0;
  const maxPaidAmount = paidCount > 0 ? Math.max(...paidAmounts) : 0;
  const accountAgeHours = user ? (now - user.createdAt.getTime()) / HOUR_MS : 0;
  const amountToAvgRatio = avgPaidAmount > 0 ? input.amount / avgPaidAmount : 0;

  return {
    currentAmount: input.amount,
    currentSubtotal: input.subtotal,
    accountAgeHours: Math.round(accountAgeHours * 10) / 10,
    bookingsLast1h: bookings1h,
    bookingsLast24h: bookings24h,
    paidCount,
    failedCount,
    refundedCount,
    avgPaidAmount,
    maxPaidAmount,
    amountToAvgRatio: Math.round(amountToAvgRatio * 100) / 100,
    priorFraudFlags,
  };
}

/** Pure scoring function — features in, score/band/reasons out. Easy to unit-test. */
export function scoreFeatures(f: RiskFeatures): Pick<RiskAssessment, 'score' | 'band' | 'reasons'> {
  let score = 0;
  const reasons: string[] = [];
  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(reason);
  };

  // 1. Account age.
  if (f.accountAgeHours < 24) {
    add(RISK_WEIGHTS.brandNewAccount, 'Akun baru (< 24 jam).');
    if (f.accountAgeHours < 1) add(RISK_WEIGHTS.freshAccount, 'Akun sangat baru (< 1 jam).');
  }

  // 2. Amount anomaly — relative to the customer's own history.
  if (f.paidCount >= 2 && f.amountToAvgRatio > 3) {
    add(RISK_WEIGHTS.amountSpike3x, `DP ${f.amountToAvgRatio}× lebih besar dari rata-rata historis.`);
    if (f.amountToAvgRatio > 5) add(RISK_WEIGHTS.amountSpike5x, 'Lonjakan nominal ekstrem (> 5×).');
  } else if (f.paidCount === 0 && f.currentAmount >= NEW_USER_HIGH_AMOUNT) {
    add(RISK_WEIGHTS.newUserHighAmount, 'Nominal besar dari akun tanpa riwayat pembayaran.');
  }

  // 3. Frequency / velocity.
  if (f.bookingsLast1h >= BURST_1H) add(RISK_WEIGHTS.burst1h, `${f.bookingsLast1h} booking dalam 1 jam.`);
  if (f.bookingsLast24h >= BUSY_24H) add(RISK_WEIGHTS.busy24h, `${f.bookingsLast24h} booking dalam 24 jam.`);

  // 4. Negative history.
  if (f.failedCount >= 3) add(RISK_WEIGHTS.manyFailed, `${f.failedCount} pembayaran gagal/kedaluwarsa.`);
  if (f.refundedCount >= 2) add(RISK_WEIGHTS.manyRefunded, `${f.refundedCount} transaksi refund/sengketa.`);
  if (f.priorFraudFlags > 0) add(RISK_WEIGHTS.priorFlag, `${f.priorFraudFlags} flag fraud sebelumnya.`);

  score = Math.min(100, score);
  return { score, band: bandFor(score), reasons };
}

/** Don't spam identical flags — one RISK_SCORE flag per user per hour. */
async function alreadyRiskFlagged(userId: string): Promise<boolean> {
  const existing = await prisma.fraudFlag.findFirst({
    where: { userId, type: 'RISK_SCORE', createdAt: { gte: new Date(Date.now() - HOUR_MS) } },
    select: { id: true },
  });
  return existing != null;
}

/**
 * Assess the risk of a booking. Gathers signals, scores them, LOGS the feature
 * vector for ML, and (on HIGH) writes a dedup'd FraudFlag. Never throws — on any
 * error it returns a neutral LOW assessment so it can't block a real booking.
 */
export async function assessBookingRisk(input: RiskInput): Promise<RiskAssessment> {
  try {
    const features = await gatherFeatures(input);
    const { score, band, reasons } = scoreFeatures(features);
    const shouldBlock = score >= riskBlockThreshold();

    // The ML dataset row. `outcome` is the label, filled in later from the
    // transaction's eventual fate (settled-good vs refund-abuse/chargeback).
    logEvent('risk.scored', {
      customerId: input.customerId,
      modelVersion: RISK_MODEL_VERSION,
      score,
      band,
      shouldBlock,
      outcome: null,
      ...features,
    });

    if (band === 'HIGH' && !(await alreadyRiskFlagged(input.customerId))) {
      await prisma.fraudFlag.create({
        data: {
          userId: input.customerId,
          type: 'RISK_SCORE',
          severity: 'HIGH',
          note: `Skor risiko ${score}/100. ${reasons.join(' ')}`,
        },
      });
      logEvent('fraud.flagged', { userId: input.customerId, type: 'RISK_SCORE', score });
    }

    return { score, band, reasons, features, modelVersion: RISK_MODEL_VERSION, shouldBlock };
  } catch (err) {
    // Advisory only — a scoring failure must not break booking.
    logEvent('risk.scored', { customerId: input.customerId, error: String(err) }, 'warn');
    return {
      score: 0,
      band: 'LOW',
      reasons: [],
      features: emptyFeatures(input),
      modelVersion: RISK_MODEL_VERSION,
      shouldBlock: false,
    };
  }
}

function emptyFeatures(input: RiskInput): RiskFeatures {
  return {
    currentAmount: input.amount,
    currentSubtotal: input.subtotal,
    accountAgeHours: 0,
    bookingsLast1h: 0,
    bookingsLast24h: 0,
    paidCount: 0,
    failedCount: 0,
    refundedCount: 0,
    avgPaidAmount: 0,
    maxPaidAmount: 0,
    amountToAvgRatio: 0,
    priorFraudFlags: 0,
  };
}
