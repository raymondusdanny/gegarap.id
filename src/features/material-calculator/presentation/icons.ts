/**
 * Maps the `icon` string on a Formula to a Lucide component. Keeping this in the
 * presentation layer lets the config stay framework-agnostic (it only names an
 * icon; it never imports React).
 */
import {
  BrickWall,
  Blocks,
  Grid3x3,
  Layers,
  Box,
  Mountain,
  PaintRoller,
  Calculator,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  BrickWall,
  Blocks,
  Grid3x3,
  Layers,
  Box,
  Mountain,
  PaintRoller,
};

export function resolveIcon(name: string): LucideIcon {
  return ICONS[name] ?? Calculator;
}
