'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Hammer, Search, LayoutDashboard, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/Button';

const links = [
  { href: '/search', label: 'Cari Tukang', icon: Search },
  { href: '/onboarding', label: 'Jadi Mitra', icon: Briefcase },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu whenever the route changes.
  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'glass border-b border-border/70 shadow-soft'
          : 'border-b border-transparent bg-background/80 backdrop-blur-sm'
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="gegarap.id beranda">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow transition-transform duration-300 group-hover:scale-105 group-hover:rotate-6">
            <Hammer className="h-5 w-5" />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-foreground">
            gegarap<span className="text-primary">.id</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + '/');
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-primary-light text-primary-800'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/search" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Masuk
          </Link>
          <Link href="/onboarding" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
            Daftar Gratis
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-muted md:hidden"
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border glass md:hidden animate-fade-down">
          <nav className="container flex flex-col gap-1 py-4">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + '/');
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition-colors',
                    active ? 'bg-primary-light text-primary-800' : 'text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {l.label}
                </Link>
              );
            })}
            <Link
              href="/onboarding"
              className={buttonVariants({
                variant: 'primary',
                size: 'lg',
                className: 'mt-2 w-full',
              })}
            >
              Daftar Gratis
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
