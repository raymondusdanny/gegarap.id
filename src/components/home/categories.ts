import { Droplets, Zap, SprayCan, Sprout, HardHat, type LucideIcon } from 'lucide-react';
import { PROVIDER_CATEGORIES } from '@/lib/validations';

/**
 * Presentation metadata for the public service categories. The `name` values are
 * the SINGLE source of truth from {@link PROVIDER_CATEGORIES} — they must match
 * `ProviderProfile.category` exactly so the `/search?category=` link pre-filters
 * correctly. Shared by the hero search chips and the landing category grid.
 */
export interface CategoryMeta {
  name: (typeof PROVIDER_CATEGORIES)[number];
  description: string;
  icon: LucideIcon;
}

export const CATEGORY_META: CategoryMeta[] = [
  { name: 'Tukang Ledeng', description: 'Pipa bocor, kran, saluran air', icon: Droplets },
  { name: 'Tukang Listrik', description: 'Instalasi, korsleting, lampu', icon: Zap },
  { name: 'Pembersih Rumah', description: 'Bersih menyeluruh & rutin', icon: SprayCan },
  { name: 'Tukang Kebun', description: 'Rawat taman & potong rumput', icon: Sprout },
  { name: 'Tukang Bangunan', description: 'Renovasi & perbaikan rumah', icon: HardHat },
];

// Compile-time guard: every PROVIDER_CATEGORIES entry must have presentation
// metadata, so adding a new category without an icon fails the build, not prod.
const _exhaustive: Record<(typeof PROVIDER_CATEGORIES)[number], true> = Object.fromEntries(
  CATEGORY_META.map((c) => [c.name, true])
) as Record<(typeof PROVIDER_CATEGORIES)[number], true>;
void _exhaustive;
