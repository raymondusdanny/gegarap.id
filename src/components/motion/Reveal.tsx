'use client';

import * as React from 'react';
import { useInView } from '@/hooks/useInView';
import { cn } from '@/lib/utils';

/**
 * Scroll-triggered reveal. Wraps children and fades/slides them in the first
 * time they enter the viewport. Animation is pure CSS (`transform`/`opacity`),
 * so it is GPU-composited and automatically disabled under
 * `prefers-reduced-motion` via the global reset in globals.css.
 *
 * - `variant="up"`  → fade + translate-up (default), for content blocks/cards.
 * - `variant="line"` → horizontal scale-in, for the "Cara Kerja" connector line.
 */
export function Reveal({
  delay = 0,
  variant = 'up',
  className,
  children,
}: {
  delay?: number;
  variant?: 'up' | 'line';
  className?: string;
  children?: React.ReactNode;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn(variant === 'line' ? 'reveal-line' : 'reveal', inView && 'in-view', className)}
      style={delay ? ({ '--reveal-delay': `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
