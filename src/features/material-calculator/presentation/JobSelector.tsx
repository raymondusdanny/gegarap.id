'use client';

import { cn } from '@/lib/utils';
import type { Formula } from '../domain/types';
import { resolveIcon } from './icons';

interface JobSelectorProps {
  formulas: readonly Formula[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/** Grid of job cards. Selecting a job swaps the entire input set + result. */
export function JobSelector({ formulas, selectedId, onSelect }: JobSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Jenis pekerjaan"
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4"
    >
      {formulas.map((f) => {
        const Icon = resolveIcon(f.icon);
        const active = f.id === selectedId;
        return (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(f.id)}
            className={cn(
              'group flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all',
              active
                ? 'border-primary/50 bg-primary-light shadow-glow'
                : 'border-border bg-card hover:border-primary/30 hover:bg-muted/40'
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-primary'
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span
              className={cn(
                'text-sm font-bold leading-tight',
                active ? 'text-primary-800' : 'text-foreground'
              )}
            >
              {f.label}
            </span>
            <span className="text-xs leading-snug text-muted-foreground">{f.group}</span>
          </button>
        );
      })}
    </div>
  );
}
