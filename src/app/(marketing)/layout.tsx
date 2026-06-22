'use client';

import { useEffect } from 'react';

// DECISION: Section 3 says "Lenis only in (marketing)", Section 9 says "mobile =
// 0 bytes Lenis/GSAP". Both win by loading Lenis + the GSAP ticker bridge via a
// RUNTIME dynamic import that only executes on desktop without reduced-motion.
// On mobile/reduced-motion the chunks are never fetched → native scroll, 0 bytes.
// A route-group layout is the correct place to scope smooth-scroll to (marketing).
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.innerWidth < 768) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    let cleanup = () => {};

    Promise.all([import('lenis'), import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([lenisMod, gsapMod, stMod]) => {
        if (cancelled) return;
        const Lenis = lenisMod.default;
        const gsap = gsapMod.default ?? gsapMod.gsap;
        const ScrollTrigger = stMod.ScrollTrigger;

        gsap.registerPlugin(ScrollTrigger);
        const lenis = new Lenis();

        // Keep ScrollTrigger in sync with Lenis, and drive Lenis off gsap's ticker
        // so the scrub camera zoom in Scene.tsx scrubs smoothly with the scroll.
        lenis.on('scroll', ScrollTrigger.update);
        const tick = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);

        cleanup = () => {
          gsap.ticker.remove(tick);
          lenis.destroy();
        };
      }
    );

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return <>{children}</>;
}
