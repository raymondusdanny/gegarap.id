/**
 * Optional Sentry forwarding (PROMPT MASTER Bagian 10).
 *
 * Dependency-free by design: this module never imports `@sentry/nextjs`, so the
 * build never breaks whether or not the package is installed. Instead, when
 * Sentry IS set up, `instrumentation.ts` calls `registerSentry()` with the real
 * SDK functions; until then these helpers are safe no-ops and the structured
 * logger still prints everything.
 *
 * Call sites pass `paymentId`/`bookingId` tags so an error in Sentry can be
 * traced straight to the offending transaction (Bagian 10).
 */

export type CaptureLevel = 'info' | 'warning' | 'error' | 'fatal';

export interface CaptureContext {
  tags?: Record<string, string | number | undefined>;
  extra?: Record<string, unknown>;
  level?: CaptureLevel;
}

export interface SentryHandler {
  captureException(error: unknown, ctx?: CaptureContext): void;
  captureMessage(message: string, ctx?: CaptureContext): void;
}

let handler: SentryHandler | null = null;

/** Wire the real Sentry SDK (from instrumentation.ts). */
export function registerSentry(h: SentryHandler): void {
  handler = h;
}

export function isSentryEnabled(): boolean {
  return handler != null;
}

/** Drop undefined tag values so the SDK only sees real strings/numbers. */
function cleanTags(
  tags?: Record<string, string | number | undefined>
): Record<string, string | number> | undefined {
  if (!tags) return undefined;
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(tags)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export function captureException(error: unknown, ctx: CaptureContext = {}): void {
  if (!handler) return;
  try {
    handler.captureException(error, { ...ctx, tags: cleanTags(ctx.tags) });
  } catch {
    // Sentry must never break the path it's observing.
  }
}

export function captureMessage(message: string, ctx: CaptureContext = {}): void {
  if (!handler) return;
  try {
    handler.captureMessage(message, { ...ctx, tags: cleanTags(ctx.tags) });
  } catch {
    // ditto.
  }
}
