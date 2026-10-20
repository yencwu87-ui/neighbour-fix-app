import type { Quote } from './types';

export function money(n: number | null | undefined): string {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return 'S$' + v.toLocaleString('en-SG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function quoteTotals(q: Quote | null | undefined) {
  if (!q) return { labour: 0, materials: 0, callout: 0, fees: 0, total: 0 };
  const labour = (q.labour ?? []).reduce((a, l) => a + (Number(l.amount) || 0), 0);
  const materials = (q.materials ?? []).reduce((a, m) => a + (Number(m.qty) || 0) * (Number(m.unit) || 0), 0);
  const callout = Number(q.callout) || 0;
  const fees = (q.fees ?? []).reduce((a, f) => a + (Number(f.amount) || 0), 0);
  return { labour, materials, callout, fees, total: labour + materials + callout + fees };
}

/** Commission the pro owes: a percentage of labour plus call-out, never of materials or customer fees. */
export function commission(q: Quote | null | undefined, fallbackPct: number): number {
  const t = quoteTotals(q);
  const pct = q?.commission_pct ?? fallbackPct;
  return ((t.labour + t.callout) * (Number(pct) || 0)) / 100;
}

/** Turns "Choked sink 80-120" lines into price ranges. Lines that don't match are skipped. */
export function parsePrices(text: string | null | undefined) {
  return String(text ?? '')
    .split('\n')
    .map((line) => {
      const m = line.match(/^(.*?)[\s:]+S?\$?\s*(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*S?\$?\s*(\d+(?:\.\d+)?)/i);
      return m ? { job: m[1].trim(), low: Number(m[2]), high: Number(m[3]) } : null;
    })
    .filter((x): x is { job: string; low: number; high: number } => x !== null);
}
