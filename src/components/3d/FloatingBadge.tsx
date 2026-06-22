'use client';

import { Html } from '@react-three/drei';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

/**
 * Trust badge anchored above-right of the house model (master prompt §6).
 * Rendered as drei `Html` so it's crisp DOM (no distanceFactor → fixed UI size,
 * not scaled by the camera zoom). Content is FROZEN, not a placeholder.
 * Fades in 0.5s after the scene mounts via Framer Motion.
 */
export function FloatingBadge() {
  return (
    <Html position={[1.7, 1.9, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex select-none items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card/95 px-3.5 py-2 text-sm font-semibold text-foreground shadow-elevated backdrop-blur"
      >
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
        4.9 · 10.000+ review
      </motion.div>
    </Html>
  );
}
