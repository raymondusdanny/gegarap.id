import { ok, fail, handle } from '@/lib/api';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { runCalculation } from '@/features/material-calculator/application/service';

export const runtime = 'nodejs';

/**
 * POST /api/material/calculate
 *
 * Stateless material-estimate endpoint. It runs the exact same pure engine the
 * client uses for instant results, so a server-side estimate (e.g. from a future
 * quote flow or a mobile client) is guaranteed to match the UI. Validation,
 * unit-normalisation and pricing all live in MaterialCalculatorService.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const limit = await rateLimit(`material:calc:${clientIp(req)}`, {
      windowMs: 60_000,
      max: 60,
    });
    if (!limit.ok) return fail('Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429);

    const body = await req.json().catch(() => null);
    if (!body) return fail('Body permintaan tidak valid.', 400);

    const result = runCalculation(body);
    return ok(result);
  })();
}
