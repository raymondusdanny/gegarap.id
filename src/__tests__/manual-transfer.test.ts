import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildManualTransferInstruction,
  isManualTransferConfigured,
  uniqueCodeFor,
} from '@/lib/manual-transfer';

const ENV_KEYS = ['MANUAL_TRANSFER_BANK', 'MANUAL_TRANSFER_ACCOUNT', 'MANUAL_TRANSFER_HOLDER'];

function setBankEnv() {
  process.env.MANUAL_TRANSFER_BANK = 'BCA';
  process.env.MANUAL_TRANSFER_ACCOUNT = '1234567890';
  process.env.MANUAL_TRANSFER_HOLDER = 'PT Gegarap Indonesia';
}

describe('isManualTransferConfigured', () => {
  beforeEach(() => ENV_KEYS.forEach((k) => delete process.env[k]));
  afterEach(() => ENV_KEYS.forEach((k) => delete process.env[k]));

  it('false saat env belum diisi', () => {
    expect(isManualTransferConfigured()).toBe(false);
  });

  it('true saat ketiga env terisi', () => {
    setBankEnv();
    expect(isManualTransferConfigured()).toBe(true);
  });
});

describe('uniqueCodeFor', () => {
  it('deterministik & dalam rentang 1..999', () => {
    const a = uniqueCodeFor('GGR-abc-123');
    expect(a).toBe(uniqueCodeFor('GGR-abc-123'));
    expect(a).toBeGreaterThanOrEqual(1);
    expect(a).toBeLessThanOrEqual(999);
  });
});

describe('buildManualTransferInstruction', () => {
  beforeEach(setBankEnv);
  afterEach(() => ENV_KEYS.forEach((k) => delete process.env[k]));

  it('nominal transfer = amount + kode unik, ambil detail dari env', () => {
    const ref = 'GGR-test-1';
    const inst = buildManualTransferInstruction({ amount: 100_000, reference: ref });
    expect(inst.method).toBe('MANUAL_TRANSFER');
    expect(inst.bankName).toBe('BCA');
    expect(inst.accountNumber).toBe('1234567890');
    expect(inst.uniqueCode).toBe(uniqueCodeFor(ref));
    expect(inst.transferAmount).toBe(100_000 + inst.uniqueCode);
    expect(inst.instructions.length).toBeGreaterThan(0);
  });

  it('throw saat bank belum dikonfigurasi', () => {
    ENV_KEYS.forEach((k) => delete process.env[k]);
    expect(() => buildManualTransferInstruction({ amount: 1, reference: 'x' })).toThrow();
  });
});
