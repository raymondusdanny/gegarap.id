/**
 * Minimal structured logger (PROMPT MASTER Bagian 10). Emits one JSON line per
 * event instead of free-form `console.log`, so logs are queryable and can be
 * tagged with paymentId/bookingId for tracing a transaction.
 *
 * Two sinks beyond stdout, both optional and best-effort:
 *  - Sentry (via `lib/sentry`) for `warn`/`error` — no-op until configured.
 *  - Ops WhatsApp (`OPS_ALERT_PHONE`) for the must-page alarms in `notifyOps`.
 */

import { captureMessage, type CaptureLevel } from './sentry';
import { sendWAMessage } from './whatsapp';

export type LogLevel = 'info' | 'warn' | 'error';

/** Canonical event names the payment system emits (Bagian 10). */
export type PaymentLogEvent =
  | 'payment.created'
  | 'payment.status_changed'
  | 'webhook.received'
  | 'webhook.verified'
  | 'webhook.signature_invalid'
  | 'webhook.duplicate'
  | 'webhook.anomaly'
  | 'disbursement.executed'
  | 'disbursement.failed'
  | 'refund.requested'
  | 'refund.resolved'
  | 'refund.gateway'
  | 'reconciliation.run'
  | 'reconciliation.healed'
  | 'autorelease.run'
  | 'autocancel.run'
  | 'notification.sent'
  | 'notification.failed'
  | 'fraud.flagged'
  | 'ops.alerted';

/** Pull the standard trace tags out of a log payload for Sentry. */
function traceTags(data: Record<string, unknown>): Record<string, string | number | undefined> {
  const pick = (k: string) =>
    typeof data[k] === 'string' || typeof data[k] === 'number'
      ? (data[k] as string | number)
      : undefined;
  return {
    paymentId: pick('paymentId'),
    bookingId: pick('bookingId') ?? pick('jobId'),
    order_id: pick('order_id'),
    alert: pick('alert'),
  };
}

const LEVEL_TO_SENTRY: Record<LogLevel, CaptureLevel> = {
  info: 'info',
  warn: 'warning',
  error: 'error',
};

export function logEvent(
  event: PaymentLogEvent | (string & {}),
  data: Record<string, unknown> = {},
  level: LogLevel = 'info'
): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...data });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);

  // Forward only the actionable levels to Sentry, tagged for tracing (Bagian 10).
  if (level !== 'info') {
    captureMessage(`${event}`, { level: LEVEL_TO_SENTRY[level], tags: traceTags(data), extra: data });
  }
}

/**
 * Anomalies that must page ops (Bagian 10). Logged at error level with a stable
 * `alert` tag so an alerting rule can match them, and forwarded to Sentry.
 */
export function logAlert(alert: string, data: Record<string, unknown> = {}): void {
  logEvent('webhook.anomaly', { alert, ...data }, 'error');
}

/**
 * Send a must-page alert to the ops WhatsApp (`OPS_ALERT_PHONE`). Best-effort and
 * never throws — alerting must not break the path that raised it. Use this for
 * the highest-severity alarms (financial mismatch, repeated signature failures,
 * repeated disbursement failures). Always pair with `logAlert` for the record.
 */
export async function notifyOps(alert: string, data: Record<string, unknown> = {}): Promise<void> {
  const phone = process.env.OPS_ALERT_PHONE;
  if (!phone) return;
  try {
    const lines = Object.entries(data)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join('\n');
    await sendWAMessage(
      phone,
      `🚨 *ALERT: ${alert}*\n\n${lines}\n\nenv: ${process.env.NODE_ENV ?? 'unknown'}`
    );
    logEvent('ops.alerted', { alert });
  } catch (err) {
    // Swallow — already logged via logAlert at the call site.
    console.error('[ops-alert] failed to deliver', alert, err);
  }
}
