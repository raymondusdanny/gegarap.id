import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Memuat"
      className={cn(
        'inline-block h-5 w-5 animate-spin-slow rounded-full border-[3px] border-primary/25 border-t-primary',
        className
      )}
    />
  );
}
