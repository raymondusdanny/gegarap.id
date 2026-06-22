'use client';

import { useEffect, useState } from 'react';

// DECISION: one hook owns ALL three R3F mount conditions (§6) so the gate lives
// in a single place — desktop width, reduced-motion, and WebGL availability.
const DESKTOP_MIN_WIDTH = 768;

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return (
      typeof window.WebGLRenderingContext !== 'undefined' &&
      Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * True only when the heavy 3D hero is allowed to mount (master prompt §6):
 *   - viewport ≥ 768px, AND
 *   - user has not requested reduced motion, AND
 *   - WebGL is actually available.
 * Starts `false` (SSR-safe) so the server never renders the Canvas; the caller
 * shows a static fallback until/unless this flips to `true`. Re-evaluates on
 * resize and on reduced-motion preference change so the scene unmounts cleanly
 * when conditions stop holding.
 */
export function useCanRender3D(): boolean {
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    // WebGL support doesn't change at runtime — probe once.
    const hasWebgl = webglAvailable();

    const evaluate = () => {
      const desktop = window.innerWidth >= DESKTOP_MIN_WIDTH;
      setCanRender(desktop && !reduceMq.matches && hasWebgl);
    };

    evaluate();
    window.addEventListener('resize', evaluate);
    reduceMq.addEventListener('change', evaluate);
    return () => {
      window.removeEventListener('resize', evaluate);
      reduceMq.removeEventListener('change', evaluate);
    };
  }, []);

  return canRender;
}
