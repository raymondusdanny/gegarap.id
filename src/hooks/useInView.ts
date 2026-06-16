'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * One-shot viewport detection via IntersectionObserver. Returns a ref to attach
 * to an element and a boolean that flips to `true` the first time the element
 * scrolls into view, then disconnects. ~1 KB and zero dependencies — the
 * lightweight alternative to a motion library for scroll-triggered reveals.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit = { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      // No observer support → show immediately rather than leave content hidden.
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      }
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
    // Observer options are intentionally read once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, inView };
}
