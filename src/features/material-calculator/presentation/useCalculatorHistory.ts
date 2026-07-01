'use client';

import { useCallback, useEffect, useState } from 'react';

/** A restorable snapshot of the form state that produced a result. */
export interface CalculatorSnapshot {
  jobId: string;
  inputs: Record<string, number | string>;
  units: Record<string, string>;
}

export interface HistoryEntry {
  id: string;
  at: string;
  jobLabel: string;
  totalCost: number;
  snapshot: CalculatorSnapshot;
}

const STORAGE_KEY = 'gegarap:material-calc:history';
const MAX_ENTRIES = 8;

function read(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: HistoryEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* storage full / disabled — history is best-effort, never blocks the tool. */
  }
}

/**
 * Client-only calculation history backed by localStorage. Deliberately avoids
 * the database: it needs no auth, no migration, and keeps a user's estimates
 * private to their device.
 */
export function useCalculatorHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(read());
  }, []);

  const add = useCallback((entry: Omit<HistoryEntry, 'id' | 'at'>) => {
    setEntries((prev) => {
      const next: HistoryEntry[] = [
        { ...entry, id: crypto.randomUUID(), at: new Date().toISOString() },
        ...prev,
      ].slice(0, MAX_ENTRIES);
      write(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    write([]);
  }, []);

  return { entries, add, remove, clear };
}
