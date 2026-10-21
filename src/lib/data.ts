import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Pro, Rate, Settings } from './types';

/** Small fetch hook: loads on mount, reloads on demand. */
export function useQuery<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    setLoading(true);
    try { setData(await load()); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Pull down to try again.'); }
    finally { setLoading(false); }
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { data, error, loading, reload: run };
}

export async function fetchPros(): Promise<Pro[]> {
  const { data, error } = await supabase.from('pros').select('*').eq('active', true).order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Pro[];
}

export async function fetchRates(): Promise<Record<string, Rate>> {
  const { data, error } = await supabase.from('rates').select('*');
  if (error) throw new Error(error.message);
  return Object.fromEntries(((data ?? []) as Rate[]).map((r) => [r.job_id, r]));
}

export async function fetchSettings(): Promise<Settings | null> {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Settings | null) ?? null;
}

export type ProStat = { pro_id: string; jobs: number; rating: number | null };
export async function fetchProStats(): Promise<Record<string, ProStat>> {
  const { data, error } = await supabase.rpc('pro_stats');
  if (error) throw new Error(error.message);
  return Object.fromEntries(((data ?? []) as ProStat[]).map((s) => [s.pro_id, s]));
}

export function tradesOf(p: Pro): string[] {
  return [p.trade, ...(p.trades ?? [])].map((t) => t.toLowerCase());
}

/** Checked pros who do this trade in this area, best rated first. */
export function nearbyPros(pros: Pro[], trade: string, area: string, stats: Record<string, ProStat> = {}): Pro[] {
  const want = trade.toLowerCase();
  return pros
    .filter((p) => p.kind !== 'supplier' && p.available !== false)
    .filter((p) => tradesOf(p).includes(want) || (want === 'other' && tradesOf(p).includes('handyman')))
    .filter((p) => (p.areas ?? []).includes(area))
    .sort((a, b) => (stats[b.id]?.rating ?? 0) - (stats[a.id]?.rating ?? 0));
}
