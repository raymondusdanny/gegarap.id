/**
 * Business metrics for the admin dashboard (Architecture brief Bagian 8/11).
 *
 * These answer product questions ops actually asks — not vanity counters:
 *  - booking success rate (where are jobs falling through?)
 *  - payment success rate (gateway health, not a user problem)
 *  - provider response time (how long after paying does work start?)
 *  - supply by category (where to recruit more providers)
 */

import prisma from './prisma';

export interface BusinessMetrics {
  generatedAt: string;
  booking: { completed: number; cancelled: number; successRate: number };
  payment: { paid: number; failed: number; expired: number; successRate: number };
  /** Avg minutes from DP paid → provider starts work (payment HELD). */
  providerResponse: { avgMinutes: number | null; sampled: number };
  supply: { byCategory: { category: string; activeProviders: number }[] };
}

/** Payment statuses that mean the DP was successfully captured. */
const PAID_REACHED = [
  'PAID',
  'HELD',
  'RELEASED',
  'REFUND_REQUESTED',
  'REFUND_REJECTED',
  'REFUNDED',
  'DISPUTED',
];

export async function computeBusinessMetrics(): Promise<BusinessMetrics> {
  const [jobGroups, paymentGroups, providerGroups, heldEvents] = await Promise.all([
    prisma.job.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.payment.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.providerProfile.groupBy({
      by: ['category'],
      where: { isVerified: true, available: true },
      _count: { _all: true },
    }),
    prisma.paymentEvent.findMany({
      where: { toStatus: 'HELD' },
      select: { paymentId: true, createdAt: true },
    }),
  ]);

  const jobCount = (s: string) => jobGroups.find((g) => g.status === s)?._count._all ?? 0;
  const completed = jobCount('COMPLETED');
  const cancelled = jobCount('CANCELLED');
  const bookingDenom = completed + cancelled;

  const payCount = (s: string) => paymentGroups.find((g) => g.status === s)?._count._all ?? 0;
  const paid = PAID_REACHED.reduce((sum, s) => sum + payCount(s), 0);
  const failed = payCount('FAILED');
  const expired = payCount('EXPIRED');
  const payDenom = paid + failed + expired;

  // Provider response time: paidAt → first HELD event (provider started work).
  let avgMinutes: number | null = null;
  let sampled = 0;
  if (heldEvents.length > 0) {
    const firstHeld = new Map<string, Date>();
    for (const e of heldEvents) {
      const cur = firstHeld.get(e.paymentId);
      if (!cur || e.createdAt < cur) firstHeld.set(e.paymentId, e.createdAt);
    }
    const payments = await prisma.payment.findMany({
      // Array.from (not spread) — Map iteration trips TS2802 on this tsconfig.
      where: { id: { in: Array.from(firstHeld.keys()) }, paidAt: { not: null } },
      select: { id: true, paidAt: true },
    });
    const diffs: number[] = [];
    for (const p of payments) {
      const held = firstHeld.get(p.id);
      if (held && p.paidAt) {
        const mins = (held.getTime() - p.paidAt.getTime()) / 60_000;
        if (mins >= 0) diffs.push(mins);
      }
    }
    if (diffs.length > 0) {
      avgMinutes = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
      sampled = diffs.length;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    booking: {
      completed,
      cancelled,
      successRate: bookingDenom > 0 ? completed / bookingDenom : 0,
    },
    payment: {
      paid,
      failed,
      expired,
      successRate: payDenom > 0 ? paid / payDenom : 0,
    },
    providerResponse: { avgMinutes, sampled },
    supply: {
      byCategory: providerGroups
        .map((g) => ({ category: g.category, activeProviders: g._count._all }))
        .sort((a, b) => b.activeProviders - a.activeProviders),
    },
  };
}
