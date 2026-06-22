'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Visual emphasis when the autocomplete dropdown is open. */
  active?: boolean;
}

/**
 * Presentational search field for the hero autocomplete (master prompt §4/§7).
 * Pure controlled input — all filtering/keyboard logic lives in SmartSearchAI;
 * this just renders the box + icon and forwards the ref so the parent can
 * focus/blur it (e.g. on Escape).
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, active, ...props }, ref) => {
    return (
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={ref}
          type="text"
          autoComplete="off"
          className={cn(
            'h-14 w-full rounded-2xl border bg-card pl-12 pr-4 text-base text-foreground shadow-card outline-none',
            'placeholder:text-muted-foreground/70 transition-all duration-200',
            'focus:border-primary/50 focus:ring-4 focus:ring-primary/10',
            active ? 'border-primary/50 ring-4 ring-primary/10' : 'border-border',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';
