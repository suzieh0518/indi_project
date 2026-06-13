'use client';
import { useEffect, useState, useCallback } from 'react';
import ApexChart, { baseOpts, COLORS } from '@/components/ApexChart';
import { api, fmt } from '@/lib/api';
import type { Filters, ProductRecord, MarginHistRecord } from '@/types';

export default function ProductsTab({ filters }: { filters: Filters }) {
  const [data, setData] = useState<{ by_sales: ProductRecord[]; by_qty: ProductRecord[]; margin_hist: MarginHistRecord[]; margin_avg: number; search: Record<string,unknown>[] } | null>(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Record<string,unknown>[]>([]);

  useEffect(() => {
    setData(null);
    api.products(filters).then(setData).catch(console.error);
  }, [filters]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    const res = await api.products(filters, q);
    setSearchResults(res.search);
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(search), 300);
    return () => clearTimeout(t);
  }, [search, doSearch]);

  if (!data) return <Loading />;

  const s = [...data.by_sales].reverse();
  const q = [...data.by_qty].reverse();

  return (
    <div className="space-y-2 pb-4">
      <Card title={`제품 Top ${filters.topN} (실매출금액)`}>
        <ApexChart type="bar" height={Math.max(180, s.length * 36)}
          series={[{ name: '매출', data: s.map(r => Math.round((r['실매출금액'] ?? 0) / 1e4)) }]}
          options={baseOpts({
            colors: [COLORS[0]], plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
            xaxis: { categories: s.map(r => r['제품명']), labels: { formatter: (v: any) => fmt.억(v * 1e4) } },
            yaxis: { labels: { style: { fontSize: '10px' }, maxWidth: 140 } },
            tooltip: { y: { formatter: (v: any) => fmt.num(v * 1e4) + '원' } },
          })}
        />
      </Card>
      <Card title={`제품 Top ${filters.topN} (판매수량)`}>
        <ApexChart type="bar" height={Math.max(180, q.length * 36)}
          series={[{ name: '수량', data: q.map(r => r['수량'] as number ?? 0) }]}
          options={baseOpts({
            colors: [COLORS[1]], plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
            xaxis: { categories: q.map(r => r['제품명']) },
            yaxis: { labels: { style: { fontSize: '10px' }, maxWidth: 140 } },
            tooltip: { y: { formatter: (v: any) => fmt.num(v) + '개' } },
          })}
        />
      </Card>
      <Card title="실이익율 분포">
        <ApexChart type="bar" height={200}
          series={[{ name: '건수', data: data.margin_hist.map(r => r.y) }]}
          options={baseOpts({
            colors: [COLORS[4]], plotOptions: { bar: { borderRadius: 2, columnWidth: '90%' } },
            xaxis: { categories: data.margin_hist.map(r => r.x), labels: { rotate: -45, style: { fontSize: '9px' } } },
            annotations: { xaxis: [{ x: data.margin_avg.toFixed(0), label: { text: `평균 ${fmt.pct(data.margin_avg)}`, style: { color: '#EF4444' } } }] },
          })}
        />
      </Card>
      <Card title="제품 검색">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="제품명 검색..."
          className="w-full px-3 py-2.5 border-[1.5px] border-gray-200 rounded-xl text-sm mb-3 focus:outline-none focus:border-[#6366F1]"
        />
        {searchResults.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50">{['연도','제품명','제조사','매출처','수량','매출금액','이익율'].map(h => <th key={h} className="px-2 py-2 text-left font-bold text-gray-500 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {searchResults.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-2 py-1.5">{r['연도'] as string}</td>
                    <td className="px-2 py-1.5">{r['제품명'] as string}</td>
                    <td className="px-2 py-1.5">{r['제조사'] as string}</td>
                    <td className="px-2 py-1.5">{r['매출처'] as string}</td>
                    <td className="px-2 py-1.5">{fmt.num(r['수량'] as number)}</td>
                    <td className="px-2 py-1.5">{fmt.num(r['실매출금액'] as number)}</td>
                    <td className="px-2 py-1.5">{fmt.pct(r['실이익율'] as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {search && searchResults.length === 0 && <p className="text-sm text-gray-400">결과 없음</p>}
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="bg-white mx-3 rounded-2xl p-4 shadow-sm"><p className="text-sm font-bold mb-3">{title}</p>{children}</div>;
}
function Loading() {
  return <div className="flex items-center justify-center h-40 text-gray-400 text-sm gap-2"><span className="w-5 h-5 border-2 border-gray-200 border-t-[#6366F1] rounded-full animate-spin" />불러오는 중...</div>;
}
