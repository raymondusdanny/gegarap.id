import { ShieldCheck, BadgeCheck, Star, MapPin, Award, type LucideIcon } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { StatsSection } from './StatsSection';

/**
 * Trust panel (master prompt §1B). Sits directly under the hero CTA as the first
 * thing a new visitor reads. One unified card: the five trust badges on top and
 * the live {@link StatsSection} stats row tucked beneath a divider — they read as
 * a single intentional panel rather than two floating cards. The badge row is a
 * server render (staggered entrance via the project's CSS/IntersectionObserver
 * {@link Reveal}); the stats row is the only client island and hides itself when
 * the numbers aren't ready, leaving a clean badges-only card.
 *
 * On mobile the badge row scrolls horizontally (single line, scrollbar hidden);
 * from `lg` up the five badges share the width evenly with no scroll.
 */
interface TrustBadge {
  icon: LucideIcon;
  title: string;
  sub: string;
}

const BADGES: TrustBadge[] = [
  { icon: ShieldCheck, title: 'Pembayaran Aman', sub: 'Dijamin Midtrans' },
  { icon: BadgeCheck, title: 'Tukang Terverifikasi', sub: 'KYC & foto asli' },
  { icon: Star, title: 'Rating Terpercaya', sub: 'Ulasan asli pengguna' },
  { icon: MapPin, title: 'Hyper-Local DIY', sub: 'Tukang terdekat darimu' },
  { icon: Award, title: 'Garansi Kepuasan', sub: 'Bayar setelah beres' },
];

export function TrustBar() {
  return (
    <section className="container -mt-2 sm:mt-0" aria-label="Jaminan kepercayaan gegarap.id">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {/* Trust badges (top half of the panel) */}
        <div className="flex gap-3 overflow-x-auto p-4 scrollbar-hide sm:gap-4 sm:p-5">
          {BADGES.map((b, i) => (
            <Reveal
              key={b.title}
              delay={i * 100}
              className="flex min-w-[140px] flex-1 flex-col items-center gap-2 px-2 text-center sm:min-w-0"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
                <b.icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-bold leading-tight text-foreground">{b.title}</span>
              <span className="text-xs leading-tight text-muted-foreground">{b.sub}</span>
            </Reveal>
          ))}
        </div>

        {/* Live stats (bottom half) — self-hides when the numbers aren't ready */}
        <StatsSection />
      </div>
    </section>
  );
}

export default TrustBar;
