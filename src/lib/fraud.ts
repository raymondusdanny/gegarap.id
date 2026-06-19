/**
 * Fraud & abuse prevention (PROMPT MASTER Bagian 8).
 *
 * Two checks live here; both only ever FLAG (never auto-block) — an admin
 * decides, so a false positive can't lock out an honest user (Bagian 8/14):
 *   - velocity: too many simultaneous unpaid bookings per account.
 *   - device fingerprint: one device spraying many accounts in a day.
 *
 * Refund-abuse is handled separately in `lib/refund-policy` (it needs the refund
 * decision context). Flags are written to FraudFlag.
 */

import { createHash } from 'node:crypto';
import prisma from './prisma';
import { clientIp } from './rate-limit';
import { logEvent } from './logger';

/** Max simultaneous PENDING (unpaid) bookings per account (Bagian 8). */
export const MAX_ACTIVE_PENDING = 3;

/** One device touching more than this many distinct accounts in 24h → flag. */
export const MAX_ACCOUNTS_PER_DEVICE_24H = 5;

export interface VelocityResult {
  blocked: boolean;
  activeCount: number;
}

/** Don't spam identical flags — one VELOCITY flag per user per hour is enough. */
async function alreadyFlagged(userId: string, type: string, windowMs: number): Promise<boolean> {
  const existing = await prisma.fraudFlag.findFirst({
    where: { userId, type, createdAt: { gte: new Date(Date.now() - windowMs) } },
    select: { id: true },
  });
  return existing != null;
}

/**
 * Block a new booking when the account already has MAX_ACTIVE_PENDING unpaid
 * bookings (Bagian 8: "tahan booking baru, minta verifikasi tambahan"). Flags
 * the account once per hour so ops can review repeat offenders.
 */
export async function checkBookingVelocity(customerId: string): Promise<VelocityResult> {
  const activeCount = await prisma.payment.count({
    where: { customerId, status: 'PENDING' },
  });
  if (activeCount < MAX_ACTIVE_PENDING) return { blocked: false, activeCount };

  if (!(await alreadyFlagged(customerId, 'VELOCITY', 3_600_000))) {
    await prisma.fraudFlag.create({
      data: {
        userId: customerId,
        type: 'VELOCITY',
        severity: 'MEDIUM',
        note: `${activeCount} booking PENDING bersamaan (batas ${MAX_ACTIVE_PENDING}).`,
      },
    });
    logEvent('fraud.flagged', { userId: customerId, type: 'VELOCITY', activeCount });
  }
  return { blocked: true, activeCount };
}

/** Stable, privacy-preserving device id from a client header or IP+UA hash. */
export function deviceIdFrom(req: Request): string {
  const explicit = req.headers.get('x-device-id');
  if (explicit) return createHash('sha256').update(explicit).digest('hex').slice(0, 32);
  const ip = clientIp(req);
  const ua = req.headers.get('user-agent') ?? 'unknown';
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 32);
}

/**
 * Record a (device, account) observation and flag the device if it has touched
 * more than MAX_ACCOUNTS_PER_DEVICE_24H distinct accounts in the last 24h
 * (Bagian 8). Best-effort: if the DeviceEvent table isn't present yet (migration
 * not deployed) this no-ops rather than breaking the booking flow.
 */
export async function recordDeviceAndCheck(deviceId: string, userId: string): Promise<void> {
  try {
    await prisma.deviceEvent.create({ data: { deviceId, userId } });

    const since = new Date(Date.now() - 24 * 3_600_000);
    const recent = await prisma.deviceEvent.findMany({
      where: { deviceId, createdAt: { gte: since } },
      select: { userId: true },
    });
    const distinctUsers = new Set(recent.map((r) => r.userId));
    if (distinctUsers.size <= MAX_ACCOUNTS_PER_DEVICE_24H) return;

    if (!(await alreadyFlagged(userId, 'DEVICE_MISMATCH', 24 * 3_600_000))) {
      await prisma.fraudFlag.create({
        data: {
          userId,
          type: 'DEVICE_MISMATCH',
          severity: 'HIGH',
          note: `Device dipakai ${distinctUsers.size} akun berbeda dalam 24 jam.`,
        },
      });
      logEvent('fraud.flagged', { userId, type: 'DEVICE_MISMATCH', distinctUsers: distinctUsers.size });
    }
  } catch (err) {
    // Missing table (pre-migration) or transient error — fraud detection is
    // advisory and must never block a legitimate booking.
    logEvent('fraud.flagged', { type: 'DEVICE_CHECK_SKIPPED', error: String(err) }, 'warn');
  }
}
