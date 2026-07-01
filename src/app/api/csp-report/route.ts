import { logEvent } from '@/lib/logger';

// CSP violation sink for the report-only policy (next.config.mjs). Browsers POST
// here on every would-be block; we log a compact summary so we can see what an
// enforcing policy would break BEFORE flipping it on. Best-effort and cheap: no
// DB, no auth, size-capped, always 204 so a flood of reports can never error.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY = 8_192; // ignore anything larger than a normal CSP report

export async function POST(req: Request): Promise<Response> {
  try {
    const raw = await req.text();
    if (raw && raw.length <= MAX_BODY) {
      const parsed = JSON.parse(raw) as {
        'csp-report'?: Record<string, unknown>;
      } & Record<string, unknown>;
      // Support both the legacy `{ "csp-report": {...} }` shape (report-uri) and
      // the flat Reporting-API body.
      const r = (parsed['csp-report'] ?? parsed) as Record<string, unknown>;
      logEvent(
        'csp.violation',
        {
          directive: r['violated-directive'] ?? r['effectiveDirective'],
          blocked: r['blocked-uri'] ?? r['blockedURL'],
          document: r['document-uri'] ?? r['documentURL'],
        },
        'warn'
      );
    }
  } catch {
    // Malformed report — ignore. Reporting must never surface an error.
  }
  return new Response(null, { status: 204 });
}
