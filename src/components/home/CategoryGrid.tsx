import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { CATEGORY_META } from './categories';

/**
 * Landing category grid (master prompt §7). Five service categories, each a
 * deep-link into the search filter. Server component — the scroll-in animation
 * is the project's CSS/IntersectionObserver `Reveal`, no client JS per card.
 */
export function CategoryGrid() {
  return (
    <section className="container py-20">
      <div className="mb-12 flex flex-col gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
        <div className="mx-auto max-w-2xl sm:mx-0">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Jelajahi kategori layanan
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Pilih jenis pekerjaan, kami carikan tukang terverifikasi terdekat.
          </p>
        </div>
        <Link
          href="/search"
          className="group inline-flex w-fit items-center gap-1.5 self-center text-sm font-semibold text-primary hover:text-primary-hover sm:self-auto"
        >
          Lihat semua tukang
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-5">
        {CATEGORY_META.map((c, i) => (
          <Reveal key={c.name} delay={i * 80} className="h-full">
            <Link
              href={`/search?category=${encodeURIComponent(c.name)}`}
              className="hover-lift group flex h-full flex-col items-center rounded-2xl border border-border bg-card p-6 text-center shadow-card"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <c.icon className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-bold text-foreground sm:text-base">{c.name}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
