import * as React from 'react';
import Link from 'next/link';
import { Hammer } from 'lucide-react';

/**
 * Shared chrome for the login and register screens: centred card, brand logo,
 * heading, and an optional footer line.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 sm:py-16">
      <div className="w-full max-w-md animate-fade-up">
        <Link
          href="/"
          className="mx-auto mb-8 flex w-fit items-center gap-2.5"
          aria-label="gegarap.id beranda"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            <Hammer className="h-5 w-5" />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-foreground">
            gegarap<span className="text-primary">.id</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-7 shadow-card sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>

        {footer && <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>}
      </div>
    </div>
  );
}
