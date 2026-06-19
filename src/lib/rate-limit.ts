/**
 * Lightweight in-memory fixed-window rate limiter.
 *
 * This is best-effort and PER-INSTANCE — on a multi-instance host (Vercel) each
 * lambda keeps its own counters, so it slows abuse but isn't a hard global
 * guarantee. For an authoritative cross-instance limit, back this with Redis
 * (e.g. Upstash) keeping the same call signature. It is fine as a first line of
 * defence on public read endpoints and admin actions.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  /** Requests left in the current window. */
  remaining: number;
  /** Seconds until the window resets (0 when not limited). */
  retryAfter: number;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

/** Reads the caller IP from common proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip')?.trim() ??
    'unknown'
  );
}

/** Bounds memory growth by dropping expired buckets once the map gets large. */
function sweep(now: number): void {
  if (buckets.size < 5_000) return;
  // forEach (not for...of) — Map iteration trips TS2802 on this tsconfig target.
  buckets.forEach((bucket, key) => {
    if (now > bucket.resetAt) buckets.delete(key);
  });
}

// ─── Scraping-burst detection (Architecture brief Bagian 8/9) ───────────────
// Repeatedly slamming a public endpoint *past* its rate limit is a strong signal
// of automated scraping rather than an impatient human. Count breaches per key
// and fire ONCE when the burst crosses the alert threshold (per window), so ops
// gets a single page, not a flood.

interface BreachBucket {
  breaches: number;
  resetAt: number;
  alerted: boolean;
}
const breachBuckets = new Map<string, BreachBucket>();

export interface ScrapingDetectOptions {
  windowMs: number;
  breachesBeforeAlert: number;
}

/** Record a rate-limit breach for `key`; returns true exactly once per window
 *  when the breach count crosses the alert threshold. */
export function recordRateLimitBreach(
  key: string,
  opts: ScrapingDetectOptions = { windowMs: 600_000, breachesBeforeAlert: 5 }
): boolean {
  const now = Date.now();
  const bucket = breachBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    breachBuckets.set(key, { breaches: 1, resetAt: now + opts.windowMs, alerted: false });
    return false;
  }
  bucket.breaches++;
  if (!bucket.alerted && bucket.breaches >= opts.breachesBeforeAlert) {
    bucket.alerted = true;
    return true; // cross the threshold → alert once
  }
  return false;
}

export function rateLimit(
  key: string,
  opts: RateLimitOptions = { windowMs: 60_000, max: 60 }
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.max - 1, retryAfter: 0 };
  }

  if (bucket.count >= opts.max) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { ok: true, remaining: opts.max - bucket.count, retryAfter: 0 };
}
