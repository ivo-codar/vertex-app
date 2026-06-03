import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

// ── Core persisted state hook ─────────────────────────────────────────────────
// Drop-in replacement for useState that persists to AsyncStorage.
// Returns [value, setter] — same API as useState.

export function usePersistedState<T>(key: string, defaultValue: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, _set] = useState<T>(defaultValue);

  // Load from storage once on mount
  useEffect(() => {
    AsyncStorage.getItem(key).then(stored => {
      if (stored !== null) {
        try { _set(JSON.parse(stored)); } catch {}
      }
    }).catch(() => {});
  }, []); // eslint-disable-line

  // Setter that also writes to AsyncStorage
  const set = useCallback((next: T | ((prev: T) => T)) => {
    _set(prev => {
      const val = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      AsyncStorage.setItem(key, JSON.stringify(val)).catch(() => {});
      return val;
    });
  }, [key]);

  return [value, set];
}

// ── Week-aware chart data ─────────────────────────────────────────────────────
// Stores 7-day data that auto-resets every Monday.

type WeekStore = { weekOf: string; data: number[] };

export function getCurrentMonday(): string {
  const d   = new Date();
  const dow = d.getDay() === 0 ? 7 : d.getDay(); // 1=Mon, 7=Sun
  d.setDate(d.getDate() - dow + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

export function useWeekData(key: string): [number[], (next: number[] | ((prev: number[]) => number[])) => void] {
  const empty = (): WeekStore => ({ weekOf: getCurrentMonday(), data: Array(7).fill(0) });
  const [store, setStore] = usePersistedState<WeekStore>(key, empty());

  // Auto-reset when the week changes
  useEffect(() => {
    const mon = getCurrentMonday();
    if (store.weekOf !== mon) {
      setStore({ weekOf: mon, data: Array(7).fill(0) });
    }
  }, [store.weekOf]); // eslint-disable-line

  const setData = useCallback((next: number[] | ((prev: number[]) => number[])) => {
    setStore(prev => ({
      weekOf: getCurrentMonday(),
      data: typeof next === 'function' ? (next as (p: number[]) => number[])(prev.data) : next,
    }));
  }, [setStore]);

  return [store.data, setData];
}
