import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card } from './Card';

export function StatCard({
  label,
  value,
  icon,
  trend,
  hint,
  className,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  trend?: { value: string; positive?: boolean };
  /** Small muted line under the value (e.g. a breakdown). */
  hint?: string;
  className?: string;
}) {
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && (
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">{value}</p>
      {trend && (
        <p
          className={cn(
            'mt-1 text-xs font-semibold',
            trend.positive ? 'text-emerald-600' : 'text-muted-foreground'
          )}
        >
          {trend.value}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
