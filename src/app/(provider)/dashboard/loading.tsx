import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="container py-10 sm:py-14">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-3 h-5 w-80 max-w-full" />

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
            <Skeleton className="mt-4 h-9 w-32" />
          </div>
        ))}
      </div>

      <Skeleton className="mt-10 h-7 w-48" />
      <div className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-card">
        <Skeleton className="h-11 w-full max-w-xs" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
