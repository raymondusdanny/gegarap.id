import { describe, it, expect } from 'vitest';
import {
  isCustomerOfJob,
  isProviderOfJob,
  isBookingParty,
  assertCustomerOwnsJob,
  assertProviderOwnsJob,
  isContactUnlocked,
  canViewContact,
} from '@/lib/authz';
import { ForbiddenError } from '@/lib/errors';

const job = { customerId: 'cust1', providerUserId: 'provUser1' };

describe('ownership policy (Bagian 6)', () => {
  it('mengenali pemilik customer & provider, menolak pihak lain', () => {
    expect(isCustomerOfJob(job, 'cust1')).toBe(true);
    expect(isCustomerOfJob(job, 'other')).toBe(false);
    expect(isProviderOfJob(job, 'provUser1')).toBe(true);
    expect(isProviderOfJob(job, 'other')).toBe(false);
    expect(isBookingParty(job, 'cust1')).toBe(true);
    expect(isBookingParty(job, 'provUser1')).toBe(true);
    expect(isBookingParty(job, 'stranger')).toBe(false);
  });

  it('provider belum di-assign (null) → bukan provider', () => {
    expect(isProviderOfJob({ customerId: 'c', providerUserId: null }, 'anyone')).toBe(false);
  });

  it('assert melempar ForbiddenError untuk non-pemilik', () => {
    expect(() => assertCustomerOwnsJob(job, 'cust1')).not.toThrow();
    expect(() => assertCustomerOwnsJob(job, 'x')).toThrow(ForbiddenError);
    expect(() => assertProviderOwnsJob(job, 'provUser1')).not.toThrow();
    expect(() => assertProviderOwnsJob(job, 'x')).toThrow(ForbiddenError);
  });
});

describe('contact visibility (PROTECTED, Bagian 3)', () => {
  it('terkunci sebelum DP dibayar, terbuka setelahnya', () => {
    expect(isContactUnlocked('PENDING')).toBe(false);
    expect(isContactUnlocked('DRAFT')).toBe(false);
    expect(isContactUnlocked('EXPIRED')).toBe(false);
    expect(isContactUnlocked('FAILED')).toBe(false);
    expect(isContactUnlocked('PAID')).toBe(true);
    expect(isContactUnlocked('HELD')).toBe(true);
    expect(isContactUnlocked('RELEASED')).toBe(true);
    expect(isContactUnlocked(null)).toBe(false);
  });

  it('pihak booking hanya lihat kontak setelah DP_PAID', () => {
    const customer = { id: 'cust1', role: 'CUSTOMER' as const };
    expect(canViewContact(job, customer, 'PENDING')).toBe(false);
    expect(canViewContact(job, customer, 'PAID')).toBe(true);
  });

  it('orang luar tidak pernah lihat kontak, walau sudah PAID', () => {
    expect(canViewContact(job, { id: 'stranger', role: 'CUSTOMER' }, 'PAID')).toBe(false);
  });

  it('admin selalu boleh (caller wajib AccessLog)', () => {
    expect(canViewContact(job, { id: 'admin', role: 'ADMIN' }, 'PENDING')).toBe(true);
  });
});
