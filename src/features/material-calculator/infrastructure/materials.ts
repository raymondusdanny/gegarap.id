/**
 * Material registry (infrastructure).
 *
 * The single source of truth for every material's display label, purchasing
 * unit, and default reference price. Prices are indicative Yogyakarta retail
 * figures (2026), grounded in the original kalkulator_material dataset, and are
 * always overridable per-calculation by the user in the CostEstimator. To add a
 * material, add one row here and reference its key from a formula.
 */

export type MaterialGroup =
  | 'semen'
  | 'agregat'
  | 'dinding'
  | 'lantai'
  | 'besi'
  | 'cat'
  | 'lainnya';

export interface MaterialDef {
  key: string;
  label: string;
  /** Purchasing unit shown in the shopping list, e.g. "Sak", "m³", "pcs". */
  unit: string;
  /** Indicative unit price in Rupiah. Overridable by the user. */
  defaultPrice: number;
  group: MaterialGroup;
}

export const MATERIALS: readonly MaterialDef[] = [
  { key: 'semen', label: 'Semen (PC 50 kg)', unit: 'Sak', defaultPrice: 55_000, group: 'semen' },
  { key: 'pasir', label: 'Pasir Pasang', unit: 'm³', defaultPrice: 250_000, group: 'agregat' },
  { key: 'batu_kali', label: 'Batu Kali / Belah', unit: 'm³', defaultPrice: 300_000, group: 'agregat' },
  { key: 'batu_split', label: 'Batu Split / Koral', unit: 'm³', defaultPrice: 350_000, group: 'agregat' },
  { key: 'bata_merah', label: 'Bata Merah', unit: 'pcs', defaultPrice: 1_000, group: 'dinding' },
  { key: 'bata_ringan', label: 'Bata Ringan (Hebel)', unit: 'm³', defaultPrice: 650_000, group: 'dinding' },
  { key: 'keramik', label: 'Keramik / Granit Lantai', unit: 'm²', defaultPrice: 90_000, group: 'lantai' },
  { key: 'cat', label: 'Cat Tembok', unit: 'Liter', defaultPrice: 55_000, group: 'cat' },
  { key: 'besi_10', label: 'Besi Beton Ø10 mm (12 m)', unit: 'Batang', defaultPrice: 75_000, group: 'besi' },
  { key: 'besi_6', label: 'Besi Beton Ø6 mm (12 m)', unit: 'Batang', defaultPrice: 35_000, group: 'besi' },
  { key: 'kawat_bendrat', label: 'Kawat Bendrat', unit: 'kg', defaultPrice: 25_000, group: 'besi' },
] as const;

const BY_KEY: Record<string, MaterialDef> = Object.fromEntries(
  MATERIALS.map((m) => [m.key, m])
);

export function getMaterial(key: string): MaterialDef | undefined {
  return BY_KEY[key];
}

/** Default price map (material key → Rupiah), used when the caller sends no overrides. */
export function defaultPrices(): Record<string, number> {
  return Object.fromEntries(MATERIALS.map((m) => [m.key, m.defaultPrice]));
}
