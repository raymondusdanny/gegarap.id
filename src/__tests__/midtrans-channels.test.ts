import { describe, it, expect, afterEach } from 'vitest';
import { configuredEnabledPayments, DEFAULT_ENABLED_PAYMENTS } from '@/lib/midtrans';

/**
 * Guards the "No payment channels available" fix: the resolver must NEVER yield
 * an empty array (which hides every channel), and `undefined` (auto-detect) is
 * the safe default.
 */
describe('configuredEnabledPayments (fix "No payment channels")', () => {
  afterEach(() => delete process.env.MIDTRANS_ENABLED_PAYMENTS);

  it('unset → undefined (Snap auto-detects all active channels)', () => {
    delete process.env.MIDTRANS_ENABLED_PAYMENTS;
    expect(configuredEnabledPayments()).toBeUndefined();
  });

  it('"all" → undefined (auto-detect)', () => {
    process.env.MIDTRANS_ENABLED_PAYMENTS = 'all';
    expect(configuredEnabledPayments()).toBeUndefined();
  });

  it('"default" → the curated channel list', () => {
    process.env.MIDTRANS_ENABLED_PAYMENTS = 'default';
    expect(configuredEnabledPayments()).toEqual([...DEFAULT_ENABLED_PAYMENTS]);
  });

  it('CSV → explicit trimmed list', () => {
    process.env.MIDTRANS_ENABLED_PAYMENTS = 'gopay, bca_va , shopeepay';
    expect(configuredEnabledPayments()).toEqual(['gopay', 'bca_va', 'shopeepay']);
  });

  it('blank / comma-only → undefined, NEVER an empty array', () => {
    process.env.MIDTRANS_ENABLED_PAYMENTS = '   ,  , ';
    expect(configuredEnabledPayments()).toBeUndefined();
  });
});
