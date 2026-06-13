import type { Filters } from '@/types';

function buildQuery(filters: Filters, extra: Record<string, string | number> = ''  as unknown as Record<string,string|number>): string {
  const p = new URLSearchParams();
  filters.years.forEach(v => p.append('years', v));
  filters.customers.forEach(v => p.append('customers', v));
  filters.manufacturers.forEach(v => p.append('manufacturers', v));
  filters.suppliers.forEach(v => p.append('suppliers', v));
  filters.reps.forEach(v => p.append('reps', v));
  if (extra) Object.entries(extra).forEach(([k, v]) => p.append(k, String(v)));
  return p.toString();
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  options: () => apiFetch<import('@/types').FilterOptions>('/api/options'),

  kpi: (f: Filters) =>
    apiFetch<import('@/types').KPI>(`/api/kpi?${buildQuery(f)}`),

  yearly: (f: Filters) =>
    apiFetch<import('@/types').YearlyRecord[]>(`/api/yearly?${buildQuery(f)}`),

  customers: (f: Filters) =>
    apiFetch<{ by_sales: import('@/types').CustomerRecord[]; by_profit: import('@/types').CustomerRecord[]; by_year: import('@/types').CustomerRecord[] }>(
      `/api/customers?${buildQuery(f, { top_n: f.topN })}`
    ),

  manufacturers: (f: Filters) =>
    apiFetch<{ by_manufacturer: import('@/types').ManufacturerRecord[]; by_supplier: import('@/types').ManufacturerRecord[]; pie: import('@/types').ManufacturerRecord[] }>(
      `/api/manufacturers?${buildQuery(f, { top_n: f.topN })}`
    ),

  reps: (f: Filters) =>
    apiFetch<{ summary: import('@/types').RepRecord[]; top_n: import('@/types').RepRecord[]; by_year: import('@/types').RepRecord[] }>(
      `/api/reps?${buildQuery(f, { top_n: f.topN })}`
    ),

  products: (f: Filters, search?: string) =>
    apiFetch<{ by_sales: import('@/types').ProductRecord[]; by_qty: import('@/types').ProductRecord[]; margin_hist: import('@/types').MarginHistRecord[]; margin_avg: number; search: Record<string,unknown>[] }>(
      `/api/products?${buildQuery(f, { top_n: f.topN, ...(search ? { search } : {}) })}`
    ),

  entry: (body: Record<string, unknown>) =>
    fetch('/api/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => { if (!r.ok) return r.text().then(t => { throw new Error(t); }); return r.json(); }),
};

export const fmt = {
  억: (v: number) => (v / 1e8).toFixed(1) + '억',
  num: (v: number) => Number(v).toLocaleString('ko-KR'),
  pct: (v: number) => Number(v).toFixed(2) + '%',
};
