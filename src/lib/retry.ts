/**
 * Generic retry-with-exponential-backoff (PROMPT MASTER — fault tolerance).
 *
 * Used to make outbound gateway calls (Midtrans Snap/Core/Iris) resilient to
 * TRANSIENT failures (network blips, 5xx, rate limits) without retrying
 * PERMANENT ones (4xx validation, invalid key) — retrying a 400 just wastes time
 * and money. Callers classify each error via `isRetryable`; everything that is
 * not retryable is re-thrown immediately.
 *
 * Backoff is exponential with full jitter to avoid a thundering herd when many
 * requests fail at once. The function is dependency-free and unit-testable with
 * a fake clock injected via `sleep`.
 */

import { logEvent } from './logger';

export interface RetryOptions {
  /** Total attempts including the first. Default 3. */
  attempts?: number;
  /** Base delay in ms for the backoff curve. Default 250ms. */
  baseDelayMs?: number;
  /** Cap on any single backoff wait. Default 4000ms. */
  maxDelayMs?: number;
  /** Decide whether a thrown error is worth retrying. Default: retry all. */
  isRetryable?: (err: unknown) => boolean;
  /** Label for structured logs (e.g. "midtrans.snap"). */
  label?: string;
  /** Injectable sleep so tests don't actually wait. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Full-jitter backoff: random in [0, min(cap, base * 2^attempt)] (AWS recipe). */
export function backoffDelay(attempt: number, baseMs: number, capMs: number): number {
  const exp = Math.min(capMs, baseMs * 2 ** attempt);
  return Math.floor(Math.random() * exp);
}

/**
 * Run `fn`, retrying transient failures with jittered exponential backoff.
 * Re-throws the last error once attempts are exhausted or the error is permanent.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const {
    attempts = 3,
    baseDelayMs = 250,
    maxDelayMs = 4000,
    isRetryable = () => true,
    label = 'retry',
    sleep = defaultSleep,
  } = opts;

  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = isRetryable(err);
      const isLast = attempt === attempts - 1;
      if (!retryable || isLast) {
        if (attempt > 0) {
          logEvent(
            'retry.exhausted',
            { label, attempt: attempt + 1, retryable, error: errMessage(err) },
            'warn'
          );
        }
        throw err;
      }
      const delay = backoffDelay(attempt, baseDelayMs, maxDelayMs);
      logEvent(
        'retry.attempt',
        { label, attempt: attempt + 1, nextDelayMs: delay, error: errMessage(err) },
        'warn'
      );
      await sleep(delay);
    }
  }
  // Unreachable (loop either returns or throws), but satisfies the type checker.
  throw lastErr;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
