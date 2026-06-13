import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Rating({
  value,
  count,
  className,
  showValue = true,
}: {
  value: number;
  count?: number;
  className?: string;
  showValue?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      {showValue && <span className="text-sm font-bold text-foreground">{value.toFixed(1)}</span>}
      {typeof count === 'number' && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  );
}
