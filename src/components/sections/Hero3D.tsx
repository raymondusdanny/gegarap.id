'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, type Variants } from 'framer-motion';
import { Search, Briefcase, Star, Home } from 'lucide-react';
import { buttonVariants } from '@/components/ui/Button';
import { useCanRender3D } from '@/hooks/useCanRender3D';
import { SmartSearchAI } from './SmartSearchAI';

// ssr:false → three.js/GSAP ship as a separate client chunk fetched ONLY when the
// desktop/motion/WebGL gate passes. Mobile never downloads it (§9: 0 bytes).
const Scene = dynamic(() => import('@/components/3d/Scene').then((m) => m.Scene), {
  ssr: false,
  loading: () => null,
});

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } }, // 100ms between elements (§8)
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

// DECISION: the H1 is the LCP element. §0 says performance beats visual when it
// conflicts with the §9 LCP budget, so the headline starts at opacity:1 (painted
// on first paint, even before hydration) and only slides — it never ships as
// invisible SSR markup. The other items keep the full opacity-0 fade entrance.
const headlineVariants: Variants = {
  hidden: { opacity: 1, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

/** Static visual shown when the 3D scene can't/shouldn't mount (§6 fallback). */
// DECISION: a CSS gradient + the frozen badge instead of `/images/hero-
// fallback.webp` — that asset doesn't exist, and shipping a 404 would violate
// "kode lengkap dan jalan". Pure CSS keeps the mobile path asset-free.
function HeroVisualFallback() {
  return (
    <div className="relative flex h-full items-center justify-center">
      <div className="animate-float relative flex h-52 w-52 items-center justify-center rounded-[2rem] bg-gradient-to-br from-primary/15 via-primary/5 to-transparent ring-1 ring-primary/15 sm:h-64 sm:w-64 lg:h-72 lg:w-72">
        <Home className="h-24 w-24 text-primary/70" strokeWidth={1.25} aria-hidden />
        <div className="absolute -right-3 -top-3 flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground shadow-elevated">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
          4.9 · 10.000+ review
        </div>
      </div>
    </div>
  );
}

export function Hero3D() {
  const heroRef = useRef<HTMLDivElement>(null);
  const canRender = useCanRender3D();
  const [active, setActive] = useState(true);

  // Two-way visibility → drives Scene's frameloop (always while visible, demand
  // once scrolled past). useInView is one-shot, so a local observer is used here.
  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      threshold: 0,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={heroRef} className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 hero-glow" />
      <div className="absolute inset-0 -z-10 bg-grid" />

      <div className="container grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:gap-8 lg:py-24">
        {/* Left — copy + search (frozen copy, §8) */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="max-w-xl"
        >
          <motion.div
            variants={itemVariants}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-light/60 px-4 py-1.5 text-sm font-semibold text-primary-800"
          >
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
            Tukang terverifikasi se-Yogyakarta
          </motion.div>

          <motion.h1
            variants={headlineVariants}
            className="text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            Cari <span className="text-gradient">Tukang Terpercaya</span>, Tanpa Ribet
          </motion.h1>

          <motion.p variants={itemVariants} className="mt-5 text-lg text-muted-foreground sm:text-xl">
            Cepat, aman, dan bergaransi
          </motion.p>

          <motion.div variants={itemVariants} className="mt-7">
            <SmartSearchAI />
          </motion.div>

          <motion.div variants={itemVariants} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.15 }} className="w-full sm:w-auto">
              <Link
                href="/search"
                className={buttonVariants({ variant: 'primary', size: 'lg', className: 'w-full sm:w-auto' })}
              >
                <Search className="h-5 w-5" />
                Cari Tukang
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.15 }} className="w-full sm:w-auto">
              <Link
                href="/onboarding"
                className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full sm:w-auto' })}
              >
                <Briefcase className="h-5 w-5 text-primary" />
                Jadi Mitra
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Right — 3D scene (desktop) or static fallback (mobile/reduced-motion) */}
        <div className="relative h-[300px] sm:h-[400px] lg:h-[520px]">
          {canRender ? <Scene containerRef={heroRef} active={active} /> : <HeroVisualFallback />}
        </div>
      </div>
    </section>
  );
}
