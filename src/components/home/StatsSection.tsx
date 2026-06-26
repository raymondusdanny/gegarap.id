'use client';

import useSWR from 'swr';
import { useCountUp } from '@/hooks/useCountUp';
import type { StatsResponse } from '@/app/api/stats/route';

const fetcher = async (url: string): Promise<StatsResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

/** One animated stat. Kept as a component so each gets its own useCountUp hook. */
function Stat({
  value,
  label,
  decimals = 0,
  suffix = '',
}: {
  value: number;
  label: string;
  decimals?: number;
  suffix?: string;
}) {
  const animated = useCountUp(value);
  // Indonesian grouping ("1.200"); ratings keep 1 decimal with a dot ("4.9").
  const display =
    decimals > 0
      ? animated.toFixed(decimals)
      : Math.round(animated).toLocaleString('id-ID');

  return (
    <div className="text-center">
      <p className="text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        {display}
        {suffix}
      </p>
      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{label}</p>
    </div>
  );
}

/** Shared layout for the stats row — a divider-topped band inside the panel. */
const ROW_CLASS =
  'grid grid-cols-3 gap-3 border-t border-border px-4 py-5 sm:gap-6 sm:px-6 sm:py-6';

function StatsSkeleton() {
  return (
    <div className={ROW_CLASS} aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="h-8 w-16 animate-pulse rounded-lg bg-muted sm:h-10 sm:w-24" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted sm:w-24" />
        </div>
      ))}
    </div>
  );
}

/**
 * Homepage stats row, fed by the cached `/api/stats` endpoint. Renders as the
 * lower half of the unified trust panel (see {@link TrustBar}) — a divider-topped
 * band, NOT its own card. Per spec it stays silent rather than ever showing
 * zeros: if the fetch errors, or any of the three values is 0/null, it renders
 * nothing so the panel is just the trust badges.
 */
export function StatsSection() {
  const { data, error, isLoading } = useSWR<StatsResponse>('/api/stats', fetcher, {
    revalidateOnFocus: false,
  });

  if (isLoading) return <StatsSkeleton />;

  // Silently hide on error — never surface a fetch failure on the landing page.
  if (error || !data) return null;

  // Hide the row if any metric is empty (0 or null) — no zeros shown.
  if (!data.workerCount || !data.avgRating || !data.jobCount) return null;

  return (
    <div className={ROW_CLASS} aria-label="Statistik gegarap.id">
      <Stat value={data.workerCount} label="Tukang Terverifikasi" suffix="+" />
      <Stat value={data.avgRating} label="Rating Rata-rata" decimals={1} />
      <Stat value={data.jobCount} label="Pekerjaan Selesai" suffix="+" />
    </div>
  );
}

export default StatsSection;
