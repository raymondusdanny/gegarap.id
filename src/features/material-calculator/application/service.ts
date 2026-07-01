/**
 * MaterialCalculatorService — the application-layer orchestrator.
 *
 * It ties the config (formulas), infrastructure (material prices) and domain
 * (engine) together behind two entry points:
 *   • `runCalculation` — full validation, used by the HTTP API (untrusted input).
 *   • `calculateWithForm` — thin helper for the client, where the form has
 *     already produced valid, normalised inputs (instant, no round-trip).
 *
 * The module is pure TypeScript with no server-only imports, so the browser
 * bundle can import it too — guaranteeing client and server compute identically.
 */
import type {
  Formula,
  NormalizedInputs,
  CalculationResult,
  LaborInput,
} from '../domain/types';
import { calculate, type PriceBook } from '../domain/engine';
import { MATERIALS, getMaterial } from '../infrastructure/materials';
import { getFormula } from '../configs/material-formulas';
import { NotFoundError } from '@/lib/errors';
import {
  calculateRequestSchema,
  normalizeInputs,
  buildNormalizedSchema,
  type CalculateRequest,
} from './dto';

/** Merge default material prices with any caller-supplied overrides. */
export function buildPriceBook(overrides?: Record<string, number>): PriceBook {
  const book: PriceBook = {};
  for (const m of MATERIALS) {
    const override = overrides?.[m.key];
    book[m.key] = {
      label: m.label,
      unit: m.unit,
      price: typeof override === 'number' && Number.isFinite(override) && override >= 0
        ? override
        : m.defaultPrice,
    };
  }
  return book;
}

function resolveLabor(
  labor: CalculateRequest['labor']
): LaborInput | undefined {
  if (!labor?.enabled) return undefined;
  return {
    workers: labor.workers ?? 3,
    wagePerDay: labor.wagePerDay ?? 150_000,
  };
}

/**
 * Validate and run a calculation from an untrusted request body. Throws
 * `NotFoundError` for an unknown job and `ZodError` for invalid inputs — both
 * mapped to the right HTTP status by `handle()`.
 */
export function runCalculation(input: unknown): CalculationResult {
  const request = calculateRequestSchema.parse(input);

  const formula = getFormula(request.jobId);
  if (!formula) throw new NotFoundError('Jenis pekerjaan tidak ditemukan.');

  const normalized = normalizeInputs(formula, request.inputs, request.units);
  const validated = buildNormalizedSchema(formula).parse(normalized);

  return calculate(formula, validated, {
    priceBook: buildPriceBook(request.prices),
    labor: resolveLabor(request.labor),
  });
}

/**
 * Client-side convenience: run a formula against already-normalised inputs
 * (produced by the form) with optional price overrides and labour. No schema
 * throwing — the form guards inputs — so it is safe to call on every keystroke.
 */
export function calculateWithForm(
  formula: Formula,
  normalized: NormalizedInputs,
  opts: { prices?: Record<string, number>; labor?: LaborInput } = {}
): CalculationResult {
  return calculate(formula, normalized, {
    priceBook: buildPriceBook(opts.prices),
    labor: opts.labor,
  });
}

/** Re-exports so the presentation layer has a single import surface. */
export { getFormula, MATERIALS, getMaterial };
