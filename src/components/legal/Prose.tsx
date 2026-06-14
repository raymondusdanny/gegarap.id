import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Lightweight typographic wrapper for long-form legal/marketing copy.
 *
 * The project doesn't ship @tailwindcss/typography, so we apply sensible
 * defaults to descendant elements via arbitrary variants. `scroll-mt` keeps
 * anchored headings clear of the sticky navbar when jumped to.
 */
export function Prose({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-w-none text-[15px] leading-relaxed text-muted-foreground',
        '[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:scroll-mt-24 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground',
        '[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground',
        '[&_p]:mt-3',
        '[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5',
        '[&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5',
        '[&_li]:marker:text-primary',
        '[&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline',
        '[&_strong]:font-semibold [&_strong]:text-foreground',
        className
      )}
    >
      {children}
    </div>
  );
}
