/**
 * The pure calculation engine.
 *
 * Given a Formula, already-normalised inputs, and a price book, it produces a
 * fully-priced CalculationResult. It has no I/O and no dependency on the
 * infrastructure or presentation layers — callers inject the price book — so it
 * is trivially testable and runs identically on client and server.
 */
import type {
  Formula,
  NormalizedInputs,
  CalculationResult,
  MaterialLine,
  LaborResult,
  LaborInput,
  Coefficient,
  Metric,
} from './types';
import { applyRounding, toRupiah } from './units';

/** Resolved price/label/unit for one material, injected by the application layer. */
export interface PriceEntry {
  label: string;
  unit: string;
  price: number;
}

export type PriceBook = Record<string, PriceEntry>;

export interface CalculateContext {
  priceBook: PriceBook;
  /** When provided, labour cost is included in the result. */
  labor?: LaborInput;
}

function resolveCoefficient(coeff: Coefficient, inputs: NormalizedInputs): number {
  const value = typeof coeff === 'function' ? coeff(inputs) : coeff;
  return Number.isFinite(value) ? value : 0;
}

/** Look up a derived quantity for a material/labour basis from the metric map. */
function basisValue(
  basis: string,
  metricKey: string | undefined,
  metrics: Record<string, number>
): number {
  const key = basis === 'metric' ? metricKey : basis;
  if (!key) return 0;
  return metrics[key] ?? 0;
}

/**
 * Run a formula. Missing prices default to 0 (the line still shows a quantity,
 * just an unpriced one) so a calculation never throws on an unknown material.
 */
export function calculate(
  formula: Formula,
  inputs: NormalizedInputs,
  ctx: CalculateContext
): CalculationResult {
  const metrics: Metric[] = formula.metrics(inputs);
  const metricMap: Record<string, number> = {};
  for (const m of metrics) metricMap[m.key] = m.value;

  const materials: MaterialLine[] = [];
  let materialCost = 0;

  for (const spec of formula.materials) {
    const coefficient = resolveCoefficient(spec.coefficient, inputs);
    const base = basisValue(spec.basis, spec.metricKey, metricMap);
    const waste = spec.waste ?? 0;
    const rawQty = base * coefficient * (1 + waste);
    const quantity = applyRounding(rawQty, spec.round ?? 'ceil');

    const entry = ctx.priceBook[spec.material];
    const unitPrice = entry?.price ?? 0;
    const cost = toRupiah(quantity * unitPrice);
    materialCost += cost;

    materials.push({
      material: spec.material,
      label: spec.label ?? entry?.label ?? spec.material,
      quantity,
      unit: entry?.unit ?? '',
      unitPrice,
      cost,
    });
  }

  materialCost = toRupiah(materialCost);

  const labor = computeLabor(formula, inputs, metricMap, ctx.labor);
  const totalCost = toRupiah(materialCost + (labor?.cost ?? 0));

  return {
    jobId: formula.id,
    jobLabel: formula.label,
    metrics,
    materials,
    materialCost,
    labor,
    totalCost,
    currency: 'IDR',
  };
}

function computeLabor(
  formula: Formula,
  inputs: NormalizedInputs,
  metricMap: Record<string, number>,
  labor: LaborInput | undefined
): LaborResult | null {
  if (!formula.labor || !labor) return null;

  const workers = Math.max(1, Math.floor(labor.workers));
  const wagePerDay = Math.max(0, labor.wagePerDay);
  const productivity = resolveCoefficient(formula.labor.productivity, inputs);
  if (productivity <= 0) return null;

  const base = basisValue(formula.labor.basis, formula.labor.metricKey, metricMap);
  // Total man-days ÷ crew size, rounded up to whole working days.
  const days = Math.max(1, Math.ceil(base / productivity / workers));
  const cost = toRupiah(days * workers * wagePerDay);

  return { workers, wagePerDay, days, cost };
}
