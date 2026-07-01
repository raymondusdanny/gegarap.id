'use client';

import { useState } from 'react';
import { ChevronDown, Wallet } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type { Formula } from '../domain/types';
import { getMaterial } from '../infrastructure/materials';

export interface LaborState {
  enabled: boolean;
  workers: number;
  wagePerDay: number;
}

interface CostEstimatorProps {
  formula: Formula;
  prices: Record<string, number>;
  labor: LaborState;
  onPriceChange: (materialKey: string, value: number) => void;
  onLaborChange: (patch: Partial<LaborState>) => void;
}

/**
 * Optional cost controls: toggle labour costing and override any material's unit
 * price. Only the materials the selected job actually uses are shown, so the
 * panel stays relevant as the job changes.
 */
export function CostEstimator({
  formula,
  prices,
  labor,
  onPriceChange,
  onLaborChange,
}: CostEstimatorProps) {
  const [open, setOpen] = useState(false);

  // Unique material keys used by this formula, in declared order.
  const materialKeys = Array.from(new Set(formula.materials.map((m) => m.material)));

  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Wallet className="h-4 w-4 text-primary" />
          Estimasi Biaya (opsional)
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="space-y-5 border-t border-border p-4 animate-fade-in">
          {/* Labour toggle */}
          <div>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={labor.enabled}
                onChange={(e) => onLaborChange({ enabled: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
              />
              <span className="text-sm font-semibold text-foreground">
                Sertakan biaya upah tukang
              </span>
            </label>

            {labor.enabled && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Jumlah tukang" htmlFor="labor-workers">
                  <Input
                    id="labor-workers"
                    type="number"
                    min={1}
                    max={100}
                    value={labor.workers}
                    onChange={(e) => onLaborChange({ workers: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Upah / hari (Rp)" htmlFor="labor-wage">
                  <Input
                    id="labor-wage"
                    type="number"
                    min={0}
                    step={10_000}
                    value={labor.wagePerDay}
                    onChange={(e) => onLaborChange({ wagePerDay: Number(e.target.value) })}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Price overrides */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Harga satuan material (Rp)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {materialKeys.map((key) => {
                const def = getMaterial(key);
                if (!def) return null;
                return (
                  <Field key={key} label={`${def.label} / ${def.unit}`} htmlFor={`price-${key}`}>
                    <Input
                      id={`price-${key}`}
                      type="number"
                      min={0}
                      step={1_000}
                      value={prices[key] ?? def.defaultPrice}
                      onChange={(e) => onPriceChange(key, Number(e.target.value))}
                    />
                  </Field>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
