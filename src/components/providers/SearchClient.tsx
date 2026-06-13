'use client';

import * as React from 'react';
import { Search, SlidersHorizontal, SearchX } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type { ProviderListItem } from '@/lib/types';
import { ProviderCard } from './ProviderCard';

type SortKey = 'rating' | 'price-asc' | 'price-desc';

export function SearchClient({
  providers,
  initialCategory = 'Semua',
}: {
  providers: ProviderListItem[];
  initialCategory?: string;
}) {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState(initialCategory);
  const [sort, setSort] = React.useState<SortKey>('rating');

  const categories = React.useMemo(() => {
    return ['Semua', ...Array.from(new Set(providers.map((p) => p.category)))];
  }, [providers]);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = providers.filter((p) => {
      const matchesCategory = category === 'Semua' || p.category === category;
      const matchesQuery =
        !q ||
        p.user.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.bio ?? '').toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });

    list = [...list].sort((a, b) => {
      if (sort === 'price-asc') return a.dailyRate - b.dailyRate;
      if (sort === 'price-desc') return b.dailyRate - a.dailyRate;
      return b.rating - a.rating;
    });

    return list;
  }, [providers, query, category, sort]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau keahlian tukang..."
            leftIcon={<Search className="h-4.5 w-4.5" />}
            className="sm:flex-1"
            aria-label="Cari tukang"
          />
          <div className="relative flex items-center">
            <SlidersHorizontal className="pointer-events-none absolute left-3.5 z-10 h-4 w-4 text-muted-foreground" />
            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="pl-10 sm:w-56"
              aria-label="Urutkan"
            >
              <option value="rating">Rating tertinggi</option>
              <option value="price-asc">Harga termurah</option>
              <option value="price-desc">Harga tertinggi</option>
            </Select>
          </div>
        </div>

        {/* Category chips */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200',
                category === c
                  ? 'border-primary bg-primary text-primary-foreground shadow-soft'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Result meta */}
      <p className="mt-6 text-sm text-muted-foreground">
        Menampilkan <span className="font-semibold text-foreground">{results.length}</span> tukang
        {category !== 'Semua' && (
          <>
            {' '}
            untuk <span className="font-semibold text-foreground">{category}</span>
          </>
        )}
      </p>

      {/* Results */}
      {results.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p, i) => (
            <div
              key={p.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i * 60, 360)}ms` }}
            >
              <ProviderCard provider={p} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-6"
          icon={<SearchX className="h-7 w-7" />}
          title="Tidak ada tukang yang cocok"
          description="Coba ubah kata kunci pencarian atau pilih kategori lain untuk menemukan tukang yang Anda butuhkan."
        />
      )}
    </div>
  );
}
