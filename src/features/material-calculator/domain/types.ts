/**
 * Domain types for the Smart Construction Material Calculator.
 *
 * The domain layer is framework-agnostic and side-effect free: no React, no
 * Next.js, no Prisma. Everything here is plain data + pure functions so the same
 * engine can run in the browser (instant calculation) and on the server (the
 * /api/material/calculate endpoint) from a single source of truth.
 */

/** Length units accepted from users; all are normalised to metres internally. */
export type LengthUnit = 'm' | 'cm' | 'mm';

/** How a form field is interpreted by the engine. */
export type InputKind = 'length' | 'count' | 'number' | 'select';

/** A single option for a `select` input (e.g. tile size, concrete grade). */
export interface InputOption {
  value: string;
  label: string;
}

/**
 * Declarative description of one user input for a job. The presentation layer
 * renders these; the application layer validates against them; the engine reads
 * their normalised values. Adding a field is data, not code.
 */
export interface InputSpec {
  key: string;
  label: string;
  kind: InputKind;
  /** For `length` fields, the value is normalised to metres before the engine sees it. */
  default: number | string;
  min?: number;
  max?: number;
  step?: number;
  /** Short helper text shown under the field. */
  help?: string;
  /** Suffix shown for numeric (non-length) fields, e.g. "m²", "titik". */
  suffix?: string;
  /** Required for `select` fields. */
  options?: InputOption[];
}

/**
 * Which derived geometric quantity a material line consumes. `metric` lets a
 * formula expose a custom named quantity (e.g. "boxes") from its metric map.
 */
export type QuantityBasis = 'area' | 'volume' | 'length' | 'perimeter' | 'count' | 'metric';

/** How a computed quantity is rounded before it reaches the shopping list. */
export type Rounding = 'ceil' | 'round' | 'round1' | 'round2';

/** A coefficient may be constant, or depend on the (normalised) inputs. */
export type Coefficient = number | ((inputs: NormalizedInputs) => number);

/**
 * One material consumed by a job, expressed as `coefficient × basis` plus a
 * waste allowance. This is the config-driven heart of the system: a formula is
 * a list of these.
 */
export interface MaterialLineSpec {
  /** Links to a MaterialDef in the pricing registry. */
  material: string;
  /** Multiplier applied to the chosen basis quantity. */
  coefficient: Coefficient;
  basis: QuantityBasis;
  /** Name of the metric to read when `basis === 'metric'`. */
  metricKey?: string;
  /** Fractional waste/overage, e.g. 0.05 = +5%. Defaults to 0. */
  waste?: number;
  /** Rounding applied to the final quantity. Defaults to 'ceil'. */
  round?: Rounding;
  /** Overrides the material's display label for this line (optional). */
  label?: string;
}

/** Optional labour model attached to a formula. */
export interface LaborSpec {
  /** Productivity in `basis` units completed per worker per day. */
  productivity: Coefficient;
  basis: QuantityBasis;
  metricKey?: string;
}

/** A named derived quantity surfaced to the UI (e.g. Luas 24 m²). */
export interface Metric {
  key: string;
  label: string;
  value: number;
  unit: string;
}

/**
 * A complete, self-contained calculation recipe. To add a new material job you
 * add one of these to `configs/material-formulas.ts` — the engine, service, API
 * and UI need no changes.
 */
export interface Formula {
  id: string;
  label: string;
  /** One-line description shown in the selector. */
  description: string;
  /** Lucide icon name (resolved in the presentation layer). */
  icon: string;
  /** Grouping shown as a chip, e.g. "Struktur", "Finishing". */
  group: string;
  inputs: InputSpec[];
  /**
   * Pure function deriving the geometric quantities the line items consume.
   * Receives already-normalised inputs (lengths in metres, counts as integers).
   */
  metrics: (inputs: NormalizedInputs) => Metric[];
  materials: MaterialLineSpec[];
  labor?: LaborSpec;
}

/** Inputs after unit-normalisation: lengths in metres, counts as numbers, selects as strings. */
export type NormalizedInputs = Record<string, number | string>;

/** One priced row of the material shopping list. */
export interface MaterialLine {
  material: string;
  label: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  cost: number;
}

/** Optional labour cost breakdown. */
export interface LaborResult {
  workers: number;
  wagePerDay: number;
  days: number;
  cost: number;
}

/** The full result of a calculation — the engine's output contract. */
export interface CalculationResult {
  jobId: string;
  jobLabel: string;
  metrics: Metric[];
  materials: MaterialLine[];
  materialCost: number;
  labor: LaborResult | null;
  totalCost: number;
  currency: 'IDR';
}

/** Labour parameters supplied by the caller (defaults live in the service). */
export interface LaborInput {
  workers: number;
  wagePerDay: number;
}

/** A price override map: material key → Rupiah unit price. */
export type PriceOverrides = Record<string, number>;
