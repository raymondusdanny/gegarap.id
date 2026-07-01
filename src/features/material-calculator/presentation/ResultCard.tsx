'use client';

import Link from 'next/link';
import { Wallet, Users, ArrowRight, Package, Info } from 'lucide-react';
import { buttonVariants } from '@/components/ui/Button';
import { formatCurrency, cn } from '@/lib/utils';
import type { CalculationResult } from '../domain/types';

/** Format a material quantity — whole numbers stay whole, fractions show 2 dp. */
function formatQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

export function ResultCard({ result }: { result: CalculationResult }) {
  const showCost = result.totalCost > 0;

  return (
    <div className="space-y-5">
      {/* Derived quantities */}
      {result.metrics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.metrics.map((m) => (
            <span
              key={m.key}
              className="inline-flex items-baseline gap-1.5 rounded-lg bg-primary-light px-3 py-1.5 text-sm text-primary-800"
            >
              <span className="font-medium text-primary-800/80">{m.label}:</span>
              <span className="font-bold">
                {formatQty(m.value)} {m.unit}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Material shopping list */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Rincian Kebutuhan Material</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-2.5 font-semibold">Material</th>
              <th className="px-4 py-2.5 text-right font-semibold">Volume</th>
              <th className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">Harga</th>
              <th className="px-4 py-2.5 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.materials.map((line) => (
              <tr key={line.material} className={cn(line.quantity <= 0 && 'opacity-50')}>
                <td className="px-4 py-3 font-medium text-foreground">{line.label}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-foreground">
                  {formatQty(line.quantity)} {line.unit}
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">
                  {line.unitPrice > 0 ? formatCurrency(line.unitPrice) : '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                  {line.cost > 0 ? formatCurrency(line.cost) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cost breakdown */}
      <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal material</span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatCurrency(result.materialCost)}
          </span>
        </div>
        {result.labor && (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Upah tukang ({result.labor.workers} orang × {result.labor.days} hari)
            </span>
            <span className="font-semibold tabular-nums text-amber-600">
              {formatCurrency(result.labor.cost)}
            </span>
          </div>
        )}
        <div className="mt-1 flex items-center justify-between border-t border-border pt-3">
          <span className="flex items-center gap-2 font-bold text-foreground">
            <Wallet className="h-4 w-4 text-primary" />
            Estimasi Total
          </span>
          <span className="text-2xl font-extrabold tabular-nums text-primary">
            {showCost ? formatCurrency(result.totalCost) : '—'}
          </span>
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Estimasi bersifat indikatif berdasarkan koefisien standar. Harga & volume riil dapat berbeda
        menurut lokasi, spesifikasi, dan kondisi lapangan.
      </p>

      {/* Conversion CTA back into the gegarap marketplace */}
      <Link
        href={`/search?category=Tukang%20Bangunan`}
        className={buttonVariants({ variant: 'primary', size: 'lg', className: 'w-full' })}
      >
        Cari Tukang untuk Kerjakan Ini
        <ArrowRight className="h-5 w-5" />
      </Link>
    </div>
  );
}
