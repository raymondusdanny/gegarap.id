import { describe, it, expect, vi } from 'vitest';
import { withRetry, backoffDelay } from '@/lib/retry';

const noSleep = () => Promise.resolve();

describe('withRetry', () => {
  it('berhasil di percobaan pertama → fn dipanggil sekali', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(fn, { sleep: noSleep })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('error transient lalu sukses → diulang sampai berhasil', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('blip'))
      .mockResolvedValue('ok');
    await expect(withRetry(fn, { sleep: noSleep, attempts: 3 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('error permanen (isRetryable=false) → langsung throw, tanpa retry', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('400 bad request'));
    await expect(
      withRetry(fn, { sleep: noSleep, attempts: 5, isRetryable: () => false })
    ).rejects.toThrow('400 bad request');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('habis percobaan → throw error terakhir', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('down'));
    await expect(withRetry(fn, { sleep: noSleep, attempts: 3 })).rejects.toThrow('down');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('backoffDelay', () => {
  it('tidak pernah melebihi cap', () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const d = backoffDelay(attempt, 250, 4000);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(4000);
    }
  });
});
