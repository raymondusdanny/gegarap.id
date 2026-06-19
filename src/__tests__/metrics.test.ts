import { describe, it, expect, beforeEach, type Mock } from 'vitest';
import { mockPrisma } from './mocks/prisma';
import { computeBusinessMetrics } from '@/lib/metrics';

// groupBy has heavily-overloaded generics, so the deep mock doesn't expose
// `.mockResolvedValue` at the type level — cast through Mock to set it.
const asMock = (fn: unknown) => fn as Mock;

describe('computeBusinessMetrics (Bagian 8/11)', () => {
  beforeEach(() => {
    mockPrisma.paymentEvent.findMany.mockResolvedValue([] as never);
    mockPrisma.payment.findMany.mockResolvedValue([] as never);
  });

  it('menghitung success rate booking & payment, dan suplai per kategori', async () => {
    asMock(mockPrisma.job.groupBy).mockResolvedValue([
      { status: 'COMPLETED', _count: { _all: 8 } },
      { status: 'CANCELLED', _count: { _all: 2 } },
      { status: 'PENDING', _count: { _all: 5 } },
    ]);
    asMock(mockPrisma.payment.groupBy).mockResolvedValue([
      { status: 'RELEASED', _count: { _all: 7 } },
      { status: 'PAID', _count: { _all: 1 } },
      { status: 'FAILED', _count: { _all: 1 } },
      { status: 'EXPIRED', _count: { _all: 1 } },
    ]);
    asMock(mockPrisma.providerProfile.groupBy).mockResolvedValue([
      { category: 'Tukang Bangunan', _count: { _all: 3 } },
      { category: 'Service AC', _count: { _all: 5 } },
    ]);

    const m = await computeBusinessMetrics();

    expect(m.booking.completed).toBe(8);
    expect(m.booking.cancelled).toBe(2);
    expect(m.booking.successRate).toBeCloseTo(0.8); // 8/(8+2)

    expect(m.payment.paid).toBe(8); // RELEASED + PAID
    expect(m.payment.successRate).toBeCloseTo(0.8); // 8/(8+1+1)

    // sorted desc by count
    expect(m.supply.byCategory[0]).toEqual({ category: 'Service AC', activeProviders: 5 });
  });

  it('denominator nol → rate 0, tidak NaN/throw', async () => {
    asMock(mockPrisma.job.groupBy).mockResolvedValue([]);
    asMock(mockPrisma.payment.groupBy).mockResolvedValue([]);
    asMock(mockPrisma.providerProfile.groupBy).mockResolvedValue([]);

    const m = await computeBusinessMetrics();
    expect(m.booking.successRate).toBe(0);
    expect(m.payment.successRate).toBe(0);
    expect(m.providerResponse.avgMinutes).toBeNull();
  });

  it('menghitung rata-rata respons tukang dari paidAt → HELD', async () => {
    asMock(mockPrisma.job.groupBy).mockResolvedValue([]);
    asMock(mockPrisma.payment.groupBy).mockResolvedValue([]);
    asMock(mockPrisma.providerProfile.groupBy).mockResolvedValue([]);

    const paidAt = new Date('2026-06-19T10:00:00Z');
    const heldAt = new Date('2026-06-19T10:30:00Z'); // +30 min
    mockPrisma.paymentEvent.findMany.mockResolvedValue([
      { paymentId: 'pay1', createdAt: heldAt },
    ] as never);
    mockPrisma.payment.findMany.mockResolvedValue([{ id: 'pay1', paidAt }] as never);

    const m = await computeBusinessMetrics();
    expect(m.providerResponse.avgMinutes).toBe(30);
    expect(m.providerResponse.sampled).toBe(1);
  });
});
