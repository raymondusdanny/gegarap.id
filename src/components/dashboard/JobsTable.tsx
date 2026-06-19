'use client';

import * as React from 'react';
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, Inbox, Check } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, cn } from '@/lib/utils';

export interface JobRow {
  id: string;
  customerName: string;
  /** Null until the DP is paid (PROTECTED tier — Bagian 3). */
  customerWaNumber: string | null;
  /** Null until the DP is paid (PROTECTED tier — Bagian 3). */
  customerAddress: string | null;
  estimatedDays: number;
  totalFee: number;
  status: string;
  createdAt: string;
}

const LOCKED_CONTACT = 'Tersedia setelah DP dibayar';

type SortKey = 'createdAt' | 'totalFee';
const PAGE_SIZE = 5;

const statusVariant: Record<string, 'warning' | 'primary' | 'success' | 'neutral'> = {
  PENDING: 'warning',
  CONFIRMED: 'primary',
  IN_PROGRESS: 'primary',
  ONGOING: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

const statusLabel: Record<string, string> = {
  PENDING: 'Menunggu',
  CONFIRMED: 'Dikonfirmasi',
  IN_PROGRESS: 'Berjalan',
  ONGOING: 'Berjalan',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export function JobsTable({ jobs }: { jobs: JobRow[] }) {
  const toast = useToast();
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState<SortKey>('createdAt');
  const [dir, setDir] = React.useState<'asc' | 'desc'>('desc');
  const [page, setPage] = React.useState(1);
  const [accepted, setAccepted] = React.useState<Set<string>>(new Set());

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = jobs.filter(
      (j) =>
        !q ||
        j.customerName.toLowerCase().includes(q) ||
        (j.customerAddress ?? '').toLowerCase().includes(q)
    );
    list.sort((a, b) => {
      const mult = dir === 'asc' ? 1 : -1;
      if (sort === 'totalFee') return (a.totalFee - b.totalFee) * mult;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * mult;
    });
    return list;
  }, [jobs, query, sort, dir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  React.useEffect(() => setPage(1), [query, sort, dir]);

  const toggleSort = (key: SortKey) => {
    if (sort === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(key);
      setDir('desc');
    }
  };

  const accept = (job: JobRow) => {
    setAccepted((s) => new Set(s).add(job.id));
    toast.success('Pekerjaan diterima', `Anda menerima order dari ${job.customerName}.`);
  };

  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-7 w-7" />}
        title="Belum ada pekerjaan masuk"
        description="Pekerjaan baru dari pelanggan akan muncul di sini begitu mereka melakukan booking."
      />
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari pelanggan atau alamat..."
          leftIcon={<Search className="h-4 w-4" />}
          className="sm:max-w-xs"
        />
        <p className="text-sm text-muted-foreground">{filtered.length} pekerjaan ditemukan</p>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-6 py-3 font-semibold">Pelanggan</th>
              <th className="px-6 py-3 font-semibold">Alamat</th>
              <th className="px-6 py-3 font-semibold">
                <button
                  onClick={() => toggleSort('totalFee')}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Total <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageRows.map((job) => (
              <tr key={job.id} className="transition-colors hover:bg-muted/30">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={job.customerName} size="sm" />
                    <div>
                      <div className="font-semibold text-foreground">{job.customerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {job.customerWaNumber ?? (
                          <span className="italic text-muted-foreground/60">{LOCKED_CONTACT}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="max-w-[220px] px-6 py-4">
                  <p className="truncate text-muted-foreground">
                    {job.customerAddress ?? (
                      <span className="italic text-muted-foreground/60">{LOCKED_CONTACT}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground/70">{job.estimatedDays} hari kerja</p>
                </td>
                <td className="px-6 py-4 font-semibold text-foreground">
                  {formatCurrency(job.totalFee)}
                </td>
                <td className="px-6 py-4">
                  <Badge variant={statusVariant[job.status] ?? 'neutral'}>
                    {statusLabel[job.status] ?? job.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  {accepted.has(job.id) ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                      <Check className="h-4 w-4" /> Diterima
                    </span>
                  ) : (
                    <Button size="sm" onClick={() => accept(job)}>
                      Terima
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-border md:hidden">
        {pageRows.map((job) => (
          <div key={job.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={job.customerName} size="sm" />
                <div>
                  <div className="font-semibold text-foreground">{job.customerName}</div>
                  <div className="text-xs text-muted-foreground">
                    {job.customerWaNumber ?? (
                      <span className="italic text-muted-foreground/60">{LOCKED_CONTACT}</span>
                    )}
                  </div>
                </div>
              </div>
              <Badge variant={statusVariant[job.status] ?? 'neutral'}>
                {statusLabel[job.status] ?? job.status}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {job.customerAddress ?? (
                <span className="italic text-muted-foreground/60">{LOCKED_CONTACT}</span>
              )}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-bold text-foreground">{formatCurrency(job.totalFee)}</span>
              {accepted.has(job.id) ? (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                  <Check className="h-4 w-4" /> Diterima
                </span>
              ) : (
                <Button size="sm" onClick={() => accept(job)}>
                  Terima
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border p-4">
          <p className="text-sm text-muted-foreground">
            Halaman {safePage} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors',
                safePage === 1 ? 'opacity-40' : 'hover:bg-muted'
              )}
              aria-label="Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors',
                safePage === totalPages ? 'opacity-40' : 'hover:bg-muted'
              )}
              aria-label="Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
