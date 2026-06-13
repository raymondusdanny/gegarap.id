import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('skeleton-shimmer relative overflow-hidden rounded-lg bg-muted', className)}
    />
  );
}
