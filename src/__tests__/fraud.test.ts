import { describe, it, expect, beforeEach } from 'vitest';
import { mockPrisma } from './mocks/prisma';
import {
  checkBookingVelocity,
  recordDeviceAndCheck,
  deviceIdFrom,
  MAX_ACTIVE_PENDING,
} from '@/lib/fraud';

describe('checkBookingVelocity (Bagian 8)', () => {
  beforeEach(() => {
    mockPrisma.fraudFlag.findFirst.mockResolvedValue(null as never);
    mockPrisma.fraudFlag.create.mockResolvedValue({} as never);
  });

  it('di bawah batas → tidak diblokir, tidak ada flag', async () => {
    mockPrisma.payment.count.mockResolvedValue((MAX_ACTIVE_PENDING - 1) as never);
    const res = await checkBookingVelocity('user1');
    expect(res.blocked).toBe(false);
    expect(mockPrisma.fraudFlag.create).not.toHaveBeenCalled();
  });

  it('mencapai batas → diblokir + buat FraudFlag VELOCITY', async () => {
    mockPrisma.payment.count.mockResolvedValue(MAX_ACTIVE_PENDING as never);
    const res = await checkBookingVelocity('user1');
    expect(res.blocked).toBe(true);
    expect(mockPrisma.fraudFlag.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'VELOCITY' }) })
    );
  });

  it('sudah pernah di-flag dalam window → tidak buat flag ganda', async () => {
    mockPrisma.payment.count.mockResolvedValue(MAX_ACTIVE_PENDING as never);
    mockPrisma.fraudFlag.findFirst.mockResolvedValue({ id: 'f1' } as never);
    const res = await checkBookingVelocity('user1');
    expect(res.blocked).toBe(true);
    expect(mockPrisma.fraudFlag.create).not.toHaveBeenCalled();
  });
});

describe('deviceIdFrom', () => {
  it('header x-device-id berbeda → device id berbeda', () => {
    const mk = (id: string) =>
      new Request('http://x', { headers: { 'x-device-id': id } });
    expect(deviceIdFrom(mk('a'))).not.toBe(deviceIdFrom(mk('b')));
  });

  it('IP+UA sama → device id stabil', () => {
    const mk = () => new Request('http://x', { headers: { 'user-agent': 'UA', 'x-real-ip': '1.2.3.4' } });
    expect(deviceIdFrom(mk())).toBe(deviceIdFrom(mk()));
  });
});

describe('recordDeviceAndCheck (Bagian 8)', () => {
  beforeEach(() => {
    mockPrisma.deviceEvent.create.mockResolvedValue({} as never);
    mockPrisma.fraudFlag.findFirst.mockResolvedValue(null as never);
    mockPrisma.fraudFlag.create.mockResolvedValue({} as never);
  });

  it('banyak akun berbeda di satu device → flag DEVICE_MISMATCH', async () => {
    mockPrisma.deviceEvent.findMany.mockResolvedValue(
      [...Array(6)].map((_, i) => ({ userId: `u${i}` })) as never
    );
    await recordDeviceAndCheck('dev1', 'u0');
    expect(mockPrisma.fraudFlag.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'DEVICE_MISMATCH' }) })
    );
  });

  it('sedikit akun → tidak ada flag', async () => {
    mockPrisma.deviceEvent.findMany.mockResolvedValue(
      [{ userId: 'u0' }, { userId: 'u1' }] as never
    );
    await recordDeviceAndCheck('dev1', 'u0');
    expect(mockPrisma.fraudFlag.create).not.toHaveBeenCalled();
  });

  it('tabel belum ada / error → tidak throw (advisory)', async () => {
    mockPrisma.deviceEvent.create.mockRejectedValue(new Error('relation does not exist') as never);
    await expect(recordDeviceAndCheck('dev1', 'u0')).resolves.toBeUndefined();
  });
});
