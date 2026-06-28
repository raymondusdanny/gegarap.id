import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockPrisma } from './mocks/prisma';
import {
  scoreFeatures,
  riskBlockThreshold,
  assessBookingRisk,
  type RiskFeatures,
} from '@/lib/risk-scoring';

/** A clean, low-risk baseline feature vector. */
function baseFeatures(over: Partial<RiskFeatures> = {}): RiskFeatures {
  return {
    currentAmount: 50_000,
    currentSubtotal: 150_000,
    accountAgeHours: 1000, // old account
    bookingsLast1h: 0,
    bookingsLast24h: 0,
    paidCount: 5,
    failedCount: 0,
    refundedCount: 0,
    avgPaidAmount: 50_000,
    maxPaidAmount: 80_000,
    amountToAvgRatio: 1,
    priorFraudFlags: 0,
    ...over,
  };
}

describe('scoreFeatures (pure)', () => {
  it('profil bersih → skor 0, band LOW', () => {
    const r = scoreFeatures(baseFeatures());
    expect(r.score).toBe(0);
    expect(r.band).toBe('LOW');
  });

  it('akun baru + nominal besar tanpa riwayat → poin terkumpul', () => {
    const r = scoreFeatures(
      baseFeatures({ accountAgeHours: 0.5, paidCount: 0, currentAmount: 1_500_000 })
    );
    // brandNew 20 + fresh 10 + newUserHighAmount 20 = 50
    expect(r.score).toBe(50);
    expect(r.band).toBe('MEDIUM');
  });

  it('lonjakan nominal vs riwayat → reason spike', () => {
    const r = scoreFeatures(baseFeatures({ paidCount: 3, amountToAvgRatio: 6 }));
    expect(r.reasons.join(' ')).toMatch(/lebih besar dari rata-rata/);
    expect(r.score).toBe(35); // 25 + 10
  });

  it('riwayat buruk + flag sebelumnya + burst → HIGH (capped 100)', () => {
    const r = scoreFeatures(
      baseFeatures({
        accountAgeHours: 0.5,
        paidCount: 0,
        currentAmount: 2_000_000,
        bookingsLast1h: 4,
        priorFraudFlags: 2,
      })
    );
    expect(r.score).toBe(100);
    expect(r.band).toBe('HIGH');
  });
});

describe('riskBlockThreshold', () => {
  afterEach(() => delete process.env.RISK_BLOCK_THRESHOLD);

  it('default 101 (tidak pernah block)', () => {
    expect(riskBlockThreshold()).toBe(101);
  });

  it('membaca dari env', () => {
    process.env.RISK_BLOCK_THRESHOLD = '90';
    expect(riskBlockThreshold()).toBe(90);
  });
});

describe('assessBookingRisk (integrasi mock prisma)', () => {
  beforeEach(() => {
    mockPrisma.fraudFlag.findFirst.mockResolvedValue(null as never);
    mockPrisma.fraudFlag.create.mockResolvedValue({} as never);
    mockPrisma.payment.findMany.mockResolvedValue([] as never);
    mockPrisma.payment.count.mockResolvedValue(0 as never);
    mockPrisma.fraudFlag.count.mockResolvedValue(0 as never);
    mockPrisma.job.count.mockResolvedValue(0 as never);
  });

  it('akun lama & bersih → LOW, tidak ada flag', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      createdAt: new Date(Date.now() - 30 * 24 * 3_600_000),
    } as never);

    const r = await assessBookingRisk({ customerId: 'u1', amount: 50_000, subtotal: 150_000 });
    expect(r.band).toBe('LOW');
    expect(r.shouldBlock).toBe(false);
    expect(mockPrisma.fraudFlag.create).not.toHaveBeenCalled();
  });

  it('akun baru, nominal besar, burst, ada flag → HIGH + buat FraudFlag', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ createdAt: new Date() } as never);
    mockPrisma.job.count.mockResolvedValue(3 as never);
    mockPrisma.fraudFlag.count.mockResolvedValue(1 as never);

    const r = await assessBookingRisk({ customerId: 'u1', amount: 1_500_000, subtotal: 3_000_000 });
    expect(r.band).toBe('HIGH');
    expect(mockPrisma.fraudFlag.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'RISK_SCORE' }) })
    );
  });

  it('error DB → assessment netral LOW (tidak throw)', async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error('db down') as never);
    const r = await assessBookingRisk({ customerId: 'u1', amount: 50_000, subtotal: 150_000 });
    expect(r.band).toBe('LOW');
    expect(r.score).toBe(0);
  });
});
