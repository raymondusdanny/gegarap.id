/**
 * Request validation + input normalisation for the calculator.
 *
 * This layer is the boundary between untrusted input (a form or an HTTP body)
 * and the pure domain engine. It normalises every length to metres and then
 * validates the normalised values against each formula's declared bounds, so
 * the engine only ever sees clean, in-range numbers.
 */
import { z } from 'zod';
import type { Formula, NormalizedInputs, LengthUnit } from '../domain/types';
import { toMetres, isLengthUnit } from '../domain/units';

/** Labour parameters. Defaults mirror the original calculator's assumptions. */
export const laborSchema = z.object({
  enabled: z.boolean().default(false),
  workers: z.coerce.number().int().min(1, 'Minimal 1 pekerja').max(100, 'Maksimal 100 pekerja').default(3),
  wagePerDay: z.coerce
    .number()
    .min(0, 'Upah tidak boleh negatif')
    .max(100_000_000, 'Upah tidak wajar')
    .default(150_000),
});

export type LaborRequest = z.infer<typeof laborSchema>;

/** The raw calculate request envelope (loose — per-field checks happen after normalisation). */
export const calculateRequestSchema = z.object({
  jobId: z.string().min(1, 'Pilih jenis pekerjaan'),
  inputs: z.record(z.string(), z.union([z.number(), z.string()])).default({}),
  /** Per-length-field unit; anything else defaults to metres. */
  units: z.record(z.string(), z.string()).default({}),
  labor: laborSchema.partial().optional(),
  /** Material price overrides (material key → Rupiah). */
  prices: z.record(z.string(), z.coerce.number().min(0)).optional(),
});

export type CalculateRequest = z.infer<typeof calculateRequestSchema>;

/**
 * Normalise raw inputs against a formula's spec: lengths → metres, counts →
 * integers, selects → their string value, everything falling back to the spec
 * default when absent or unparseable.
 */
export function normalizeInputs(
  formula: Formula,
  rawInputs: Record<string, number | string>,
  units: Record<string, string>
): NormalizedInputs {
  const out: NormalizedInputs = {};

  for (const spec of formula.inputs) {
    const raw = rawInputs[spec.key];

    if (spec.kind === 'select') {
      const value = typeof raw === 'string' && raw.length > 0 ? raw : String(spec.default);
      out[spec.key] = value;
      continue;
    }

    if (spec.kind === 'length') {
      const unitRaw = units[spec.key];
      const unit: LengthUnit = isLengthUnit(unitRaw) ? unitRaw : 'm';
      const n = Number(raw);
      out[spec.key] = toMetres(Number.isFinite(n) ? n : Number(spec.default) || 0, unit);
      continue;
    }

    // count | number
    const n = Number(raw);
    const value = Number.isFinite(n) ? n : Number(spec.default) || 0;
    out[spec.key] = spec.kind === 'count' ? Math.round(value) : value;
  }

  return out;
}

/**
 * Build a Zod schema that validates the NORMALISED inputs against each field's
 * declared bounds (which are expressed in the normalised unit — metres for
 * lengths). Validation failures surface as a field-error map via `handle()`.
 */
export function buildNormalizedSchema(formula: Formula): z.ZodType<NormalizedInputs> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const spec of formula.inputs) {
    if (spec.kind === 'select') {
      const allowed = (spec.options ?? []).map((o) => o.value);
      shape[spec.key] = z
        .string()
        .refine((v) => allowed.includes(v), `Pilihan ${spec.label} tidak valid`);
      continue;
    }

    let s = z.number({ message: `${spec.label} harus berupa angka` }).finite(`${spec.label} tidak valid`);
    if (spec.kind === 'count') s = s.int(`${spec.label} harus bilangan bulat`);
    if (spec.min !== undefined) s = s.min(spec.min, `${spec.label} minimal ${spec.min}`);
    if (spec.max !== undefined) s = s.max(spec.max, `${spec.label} maksimal ${spec.max}`);
    shape[spec.key] = s;
  }

  return z.object(shape) as unknown as z.ZodType<NormalizedInputs>;
}
