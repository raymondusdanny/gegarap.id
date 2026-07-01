/**
 * Config-driven formula system.
 *
 * Every construction job the calculator supports is declared here as a Formula:
 * its inputs, how to derive geometric metrics, and the material lines it
 * consumes (coefficient × basis + waste). The engine, service, API and UI are
 * all generic over this list — adding a job or material is a data change here,
 * never an engine change.
 *
 * Coefficients follow common Indonesian building practice (SNI-style analysis)
 * and are grounded in the original kalkulator_material dataset. They are
 * indicative estimates, not a substitute for a surveyor's RAB.
 */
import type { Formula, NormalizedInputs } from '../domain/types';

/** Read a normalised numeric input safely (lengths are already in metres). */
function num(inputs: NormalizedInputs, key: string, fallback = 0): number {
  const v = Number(inputs[key]);
  return Number.isFinite(v) ? v : fallback;
}

/** Read a normalised select/string input safely. */
function str(inputs: NormalizedInputs, key: string, fallback = ''): string {
  const v = inputs[key];
  return typeof v === 'string' ? v : fallback;
}

/** Steel bar mass per 12 m length (kg): Ø10 = 0.617 kg/m, Ø6 = 0.222 kg/m. */
const BAR_KG = { d10: 0.617 * 12, d6: 0.222 * 12 };

/** Reinforcement steel demand (kg per m³ of concrete) by density preset. */
const REBAR_KG_PER_M3: Record<string, number> = { none: 0, ringan: 100, sedang: 150 };

/** Cement demand (sak/m³) by concrete grade. */
const CEMENT_SAK_PER_M3: Record<string, number> = { K175: 6.5, K225: 7.4, K250: 8.0 };

/** Tile coverage per box (m²) by tile size. */
const TILE_COVERAGE: Record<string, number> = { '30x30': 1.0, '40x40': 0.96, '60x60': 1.44 };

/** Tiling productivity (m²/worker/day) by tile size — bigger tiles lay faster. */
const TILE_PRODUCTIVITY: Record<string, number> = { '30x30': 8, '40x40': 8, '60x60': 6 };

export const FORMULAS: readonly Formula[] = [
  // ── Pasangan dinding bata merah ────────────────────────────────────────────
  {
    id: 'dinding-bata-merah',
    label: 'Dinding Bata Merah',
    description: 'Pasangan dinding ½ bata merah dengan spesi 1:5.',
    icon: 'BrickWall',
    group: 'Dinding',
    inputs: [
      { key: 'panjang', label: 'Panjang dinding', kind: 'length', default: 6, min: 0.1, max: 500 },
      { key: 'tinggi', label: 'Tinggi dinding', kind: 'length', default: 3, min: 0.1, max: 20 },
      {
        key: 'bukaan',
        label: 'Luas bukaan (pintu + jendela)',
        kind: 'number',
        default: 0,
        min: 0,
        max: 10_000,
        suffix: 'm²',
        help: 'Total luas pintu & jendela yang dikurangi dari bidang dinding.',
      },
    ],
    metrics: (i) => {
      const area = Math.max(0, num(i, 'panjang') * num(i, 'tinggi') - num(i, 'bukaan'));
      return [{ key: 'area', label: 'Luas dinding', value: area, unit: 'm²' }];
    },
    materials: [
      { material: 'bata_merah', coefficient: 70, basis: 'area', waste: 0.05, round: 'ceil' },
      { material: 'semen', coefficient: 0.23, basis: 'area', round: 'ceil' },
      { material: 'pasir', coefficient: 0.043, basis: 'area', round: 'round2' },
    ],
    labor: { productivity: 4.5, basis: 'area' },
  },

  // ── Pasangan dinding bata ringan (hebel) ────────────────────────────────────
  {
    id: 'dinding-bata-ringan',
    label: 'Dinding Bata Ringan (Hebel)',
    description: 'Pasangan bata ringan dengan perekat semen instan (thin-bed).',
    icon: 'Blocks',
    group: 'Dinding',
    inputs: [
      { key: 'panjang', label: 'Panjang dinding', kind: 'length', default: 6, min: 0.1, max: 500 },
      { key: 'tinggi', label: 'Tinggi dinding', kind: 'length', default: 3, min: 0.1, max: 20 },
      {
        key: 'bukaan',
        label: 'Luas bukaan (pintu + jendela)',
        kind: 'number',
        default: 0,
        min: 0,
        max: 10_000,
        suffix: 'm²',
      },
    ],
    metrics: (i) => {
      const area = Math.max(0, num(i, 'panjang') * num(i, 'tinggi') - num(i, 'bukaan'));
      return [{ key: 'area', label: 'Luas dinding', value: area, unit: 'm²' }];
    },
    materials: [
      // 1 m³ hebel (tebal 10 cm) ≈ 8,3 m² dinding → 0,12 m³/m².
      { material: 'bata_ringan', coefficient: 0.12, basis: 'area', waste: 0.03, round: 'round2' },
      { material: 'semen', coefficient: 0.12, basis: 'area', round: 'ceil', label: 'Semen Perekat / Acian (Sak)' },
    ],
    labor: { productivity: 10, basis: 'area' },
  },

  // ── Lantai keramik / granit ─────────────────────────────────────────────────
  {
    id: 'lantai-keramik',
    label: 'Lantai Keramik / Granit',
    description: 'Pemasangan penutup lantai keramik atau granit di atas spesi.',
    icon: 'Grid3x3',
    group: 'Lantai',
    inputs: [
      { key: 'panjang', label: 'Panjang ruangan', kind: 'length', default: 6, min: 0.1, max: 500 },
      { key: 'lebar', label: 'Lebar ruangan', kind: 'length', default: 4, min: 0.1, max: 500 },
      {
        key: 'ukuran',
        label: 'Ukuran keramik',
        kind: 'select',
        default: '60x60',
        options: [
          { value: '30x30', label: '30 × 30 cm' },
          { value: '40x40', label: '40 × 40 cm' },
          { value: '60x60', label: '60 × 60 cm' },
        ],
      },
    ],
    metrics: (i) => {
      const area = num(i, 'panjang') * num(i, 'lebar');
      const coverage = TILE_COVERAGE[str(i, 'ukuran', '60x60')] ?? 1.44;
      const boxes = coverage > 0 ? Math.ceil((area * 1.05) / coverage) : 0;
      return [
        { key: 'area', label: 'Luas lantai', value: area, unit: 'm²' },
        { key: 'boxes', label: 'Perkiraan dus keramik', value: boxes, unit: 'dus' },
      ];
    },
    materials: [
      { material: 'keramik', coefficient: 1, basis: 'area', waste: 0.05, round: 'round2' },
      { material: 'semen', coefficient: 0.2, basis: 'area', round: 'ceil' },
      { material: 'pasir', coefficient: 0.05, basis: 'area', round: 'round2' },
    ],
    labor: {
      productivity: (i) => TILE_PRODUCTIVITY[str(i, 'ukuran', '60x60')] ?? 6,
      basis: 'area',
    },
  },

  // ── Plesteran & acian ───────────────────────────────────────────────────────
  {
    id: 'plesteran-acian',
    label: 'Plesteran & Acian',
    description: 'Plester spesi 1:4 tebal 15 mm ditambah finishing acian.',
    icon: 'Layers',
    group: 'Finishing',
    inputs: [
      { key: 'panjang', label: 'Panjang bidang', kind: 'length', default: 6, min: 0.1, max: 500 },
      { key: 'tinggi', label: 'Tinggi bidang', kind: 'length', default: 3, min: 0.1, max: 20 },
      {
        key: 'sisi',
        label: 'Jumlah sisi diplester',
        kind: 'select',
        default: '2',
        options: [
          { value: '1', label: '1 sisi' },
          { value: '2', label: '2 sisi' },
        ],
      },
      {
        key: 'bukaan',
        label: 'Luas bukaan',
        kind: 'number',
        default: 0,
        min: 0,
        max: 10_000,
        suffix: 'm²',
      },
    ],
    metrics: (i) => {
      const sides = num(i, 'sisi', 1) || 1;
      const oneSide = Math.max(0, num(i, 'panjang') * num(i, 'tinggi') - num(i, 'bukaan'));
      return [{ key: 'area', label: 'Luas plesteran', value: oneSide * sides, unit: 'm²' }];
    },
    materials: [
      { material: 'semen', coefficient: 0.24, basis: 'area', round: 'ceil' },
      { material: 'pasir', coefficient: 0.024, basis: 'area', round: 'round2' },
    ],
    labor: { productivity: 6, basis: 'area' },
  },

  // ── Cor beton struktur ──────────────────────────────────────────────────────
  {
    id: 'cor-beton',
    label: 'Cor Beton (Sloof / Kolom / Balok)',
    description: 'Beton struktur ready-mix konvensional beserta pembesian.',
    icon: 'Box',
    group: 'Struktur',
    inputs: [
      { key: 'panjang', label: 'Panjang', kind: 'length', default: 3, min: 0.01, max: 500 },
      { key: 'lebar', label: 'Lebar', kind: 'length', default: 0.15, min: 0.01, max: 50 },
      { key: 'tebal', label: 'Tinggi / tebal', kind: 'length', default: 0.3, min: 0.01, max: 50 },
      {
        key: 'mutu',
        label: 'Mutu beton',
        kind: 'select',
        default: 'K225',
        options: [
          { value: 'K175', label: 'K175 (non-struktur)' },
          { value: 'K225', label: 'K225 (rumah tinggal)' },
          { value: 'K250', label: 'K250 (struktur berat)' },
        ],
      },
      {
        key: 'tulangan',
        label: 'Kepadatan tulangan',
        kind: 'select',
        default: 'ringan',
        options: [
          { value: 'none', label: 'Tanpa besi' },
          { value: 'ringan', label: 'Ringan (100 kg/m³)' },
          { value: 'sedang', label: 'Sedang (150 kg/m³)' },
        ],
      },
    ],
    metrics: (i) => {
      const volume = num(i, 'panjang') * num(i, 'lebar') * num(i, 'tebal');
      return [{ key: 'volume', label: 'Volume beton', value: volume, unit: 'm³' }];
    },
    materials: [
      {
        material: 'semen',
        coefficient: (i) => CEMENT_SAK_PER_M3[str(i, 'mutu', 'K225')] ?? 7.4,
        basis: 'volume',
        round: 'ceil',
      },
      { material: 'pasir', coefficient: 0.5, basis: 'volume', round: 'round2' },
      { material: 'batu_split', coefficient: 0.8, basis: 'volume', round: 'round2' },
      {
        material: 'besi_10',
        // 70% of rebar mass as Ø10, converted to 12 m bars.
        coefficient: (i) => ((REBAR_KG_PER_M3[str(i, 'tulangan', 'ringan')] ?? 0) * 0.7) / BAR_KG.d10,
        basis: 'volume',
        round: 'ceil',
      },
      {
        material: 'besi_6',
        coefficient: (i) => ((REBAR_KG_PER_M3[str(i, 'tulangan', 'ringan')] ?? 0) * 0.3) / BAR_KG.d6,
        basis: 'volume',
        round: 'ceil',
      },
      {
        material: 'kawat_bendrat',
        coefficient: (i) => (REBAR_KG_PER_M3[str(i, 'tulangan', 'ringan')] ?? 0) * 0.015,
        basis: 'volume',
        round: 'round1',
      },
    ],
    labor: { productivity: 1.5, basis: 'volume' },
  },

  // ── Pondasi batu kali ───────────────────────────────────────────────────────
  {
    id: 'pondasi-batu-kali',
    label: 'Pondasi Batu Kali',
    description: 'Pasangan pondasi menerus batu kali penampang trapesium 1:5.',
    icon: 'Mountain',
    group: 'Struktur',
    inputs: [
      { key: 'panjang', label: 'Panjang total pondasi', kind: 'length', default: 42, min: 0.1, max: 2000 },
      { key: 'lebarAtas', label: 'Lebar atas', kind: 'length', default: 0.3, min: 0.05, max: 5 },
      { key: 'lebarBawah', label: 'Lebar bawah', kind: 'length', default: 0.6, min: 0.05, max: 5 },
      { key: 'tinggi', label: 'Tinggi pondasi', kind: 'length', default: 0.6, min: 0.1, max: 5 },
    ],
    metrics: (i) => {
      const cross = ((num(i, 'lebarAtas') + num(i, 'lebarBawah')) / 2) * num(i, 'tinggi');
      const volume = cross * num(i, 'panjang');
      return [
        { key: 'crossSection', label: 'Luas penampang', value: cross, unit: 'm²' },
        { key: 'volume', label: 'Volume pasangan', value: volume, unit: 'm³' },
      ];
    },
    materials: [
      { material: 'batu_kali', coefficient: 1.2, basis: 'volume', round: 'round2' },
      { material: 'semen', coefficient: 3.26, basis: 'volume', round: 'ceil' },
      { material: 'pasir', coefficient: 0.52, basis: 'volume', round: 'round2' },
    ],
    labor: { productivity: 1.2, basis: 'volume' },
  },

  // ── Pengecatan dinding ──────────────────────────────────────────────────────
  {
    id: 'pengecatan',
    label: 'Pengecatan Dinding',
    description: 'Cat tembok interior/eksterior, daya sebar ±10 m²/liter per lapis.',
    icon: 'PaintRoller',
    group: 'Finishing',
    inputs: [
      {
        key: 'panjang',
        label: 'Total panjang dinding (keliling)',
        kind: 'length',
        default: 20,
        min: 0.1,
        max: 2000,
        help: 'Jumlahkan panjang semua dinding yang dicat.',
      },
      { key: 'tinggi', label: 'Tinggi dinding', kind: 'length', default: 3, min: 0.1, max: 20 },
      {
        key: 'bukaan',
        label: 'Luas bukaan',
        kind: 'number',
        default: 0,
        min: 0,
        max: 10_000,
        suffix: 'm²',
      },
      {
        key: 'lapis',
        label: 'Jumlah lapis',
        kind: 'select',
        default: '2',
        options: [
          { value: '1', label: '1 lapis' },
          { value: '2', label: '2 lapis' },
          { value: '3', label: '3 lapis' },
        ],
      },
    ],
    metrics: (i) => {
      const area = Math.max(0, num(i, 'panjang') * num(i, 'tinggi') - num(i, 'bukaan'));
      return [{ key: 'area', label: 'Luas bidang cat', value: area, unit: 'm²' }];
    },
    materials: [
      {
        material: 'cat',
        // liters = area × coats ÷ 10 m² per litre-coat.
        coefficient: (i) => (num(i, 'lapis', 2) || 2) / 10,
        basis: 'area',
        round: 'round1',
      },
    ],
    labor: {
      productivity: (i) => 40 / (num(i, 'lapis', 2) || 2),
      basis: 'area',
    },
  },
] as const;

const FORMULA_BY_ID: Record<string, Formula> = Object.fromEntries(
  FORMULAS.map((f) => [f.id, f])
);

export function getFormula(id: string): Formula | undefined {
  return FORMULA_BY_ID[id];
}

export const FORMULA_IDS = FORMULAS.map((f) => f.id);
