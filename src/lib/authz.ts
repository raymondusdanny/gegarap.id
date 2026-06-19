/**
 * Authorization policy (Architecture brief Bagian 6). Pure functions — no DB
 * calls — so they're unit-testable and can be the SECOND line of defence in the
 * service/route layer (not just middleware, which a crafted request can bypass).
 *
 * Two concerns:
 *  1. Ownership: a PROVIDER may only touch their own bookings, a CUSTOMER only
 *     theirs (role alone isn't enough — provider A ≠ provider B).
 *  2. PROTECTED-tier contact visibility: counterparty phone/address opens only
 *     after the DP is paid, and only to the two parties (Bagian 3).
 */

import { ForbiddenError } from './errors';
import type { PaymentStatus } from './payment-state';

export type Role = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';

/** The minimal ownership shape of a booking needed for these checks. */
export interface JobOwnership {
  customerId: string;
  /** The provider's *User* id (not the ProviderProfile id). Null = unassigned. */
  providerUserId: string | null;
}

export interface Viewer {
  id: string;
  role: Role;
}

// ─── Ownership ──────────────────────────────────────────────────────────────

export function isCustomerOfJob(job: JobOwnership, userId: string): boolean {
  return job.customerId === userId;
}

export function isProviderOfJob(job: JobOwnership, userId: string): boolean {
  return job.providerUserId != null && job.providerUserId === userId;
}

/** True if the user is either party to the booking. */
export function isBookingParty(job: JobOwnership, userId: string): boolean {
  return isCustomerOfJob(job, userId) || isProviderOfJob(job, userId);
}

export function assertCustomerOwnsJob(job: JobOwnership, userId: string): void {
  if (!isCustomerOfJob(job, userId)) throw new ForbiddenError('Booking ini bukan milik Anda.');
}

export function assertProviderOwnsJob(job: JobOwnership, userId: string): void {
  if (!isProviderOfJob(job, userId)) throw new ForbiddenError('Pekerjaan ini tidak ditugaskan ke Anda.');
}

// ─── PROTECTED-tier contact visibility (Bagian 3) ───────────────────────────

/**
 * Payment statuses at/after DP_PAID. Once the DP is paid the two parties need
 * each other's contact to coordinate; before that, it stays hidden. We keep it
 * visible for the rest of the lifecycle (incl. refund/dispute) because contact
 * was already legitimately exchanged at PAID.
 */
export const CONTACT_UNLOCKED_STATUSES: readonly PaymentStatus[] = [
  'PAID',
  'HELD',
  'RELEASED',
  'REFUND_REQUESTED',
  'REFUND_REJECTED',
  'REFUNDED',
  'DISPUTED',
];

/** True once a booking's payment has reached DP_PAID (contact may be shared). */
export function isContactUnlocked(paymentStatus: string | null | undefined): boolean {
  return paymentStatus != null && (CONTACT_UNLOCKED_STATUSES as readonly string[]).includes(paymentStatus);
}

/**
 * Whether `viewer` may see the counterparty's PROTECTED contact (phone, full
 * address) on this booking. Admins always may (caller must AccessLog it);
 * parties may only after the DP is paid.
 */
export function canViewContact(
  job: JobOwnership,
  viewer: Viewer,
  paymentStatus: string | null | undefined
): boolean {
  if (viewer.role === 'ADMIN') return true;
  return isBookingParty(job, viewer.id) && isContactUnlocked(paymentStatus);
}
