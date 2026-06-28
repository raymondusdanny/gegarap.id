import { NextResponse } from 'next/server';
import { handleMidtransWebhook } from '@/lib/services/midtrans-webhook';

/**
 * Thin controller: parse the body and delegate to the webhook service, which
 * owns all verification/idempotency/state logic and returns the HTTP outcome.
 * An unexpected error from the service propagates to a 500 so Midtrans retries
 * (the service only throws when an event must be reprocessed, never recording it).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  const result = await handleMidtransWebhook(body);
  return NextResponse.json(result.payload, { status: result.httpStatus });
}

// Register this URL in Midtrans Dashboard → Settings → Configuration →
// Payment Notification URL: https://www.gegarap.id/api/webhooks/midtrans
