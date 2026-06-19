import { ok, fail, handle } from '@/lib/api';
import { requireAdmin } from '@/lib/admin-guard';
import { computeBusinessMetrics } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/metrics — business KPIs for the admin dashboard (Bagian 8/11).
 * Admin-only; lets ops/dashboards read metrics without hand-querying the DB.
 */
export async function GET() {
  return handle(async () => {
    const admin = await requireAdmin();
    if (!admin) return fail('Akses ditolak.', 403);
    return ok(await computeBusinessMetrics());
  })();
}
