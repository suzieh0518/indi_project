'use client';
import { useEffect, useState } from 'react';
import ApexChart, { baseOpts, COLORS } from '@/components/ApexChart';
import { api, fmt } from '@/lib/api';
import type { Filters, CustomerRecord } from '@/types';

export default function CustomersTab({ filters }: { filters: Filters }) {
  const [data, setData] = useState<{ by_sales: CustomerRecord[]; by_profit: CustomerRecord[]; by_year: CustomerRecord[] } | null>(null);

  useEffect(() => {
    setData(null);
    api.customers(filters).then(setData).catch(console.error);
  }, [filters]);

  if (!data) return <Loading />;

  const s = [...data.by_sales].reverse();
  const p = [...data.by_profit].reverse();
  const allYears = [...new Set(data.by_year.map(r => r['연도']))].sort() as string[];
  const allCusts = data.by_sales.map(r => r['매출처']);

  return (
    <div className="space-y-2 pb-4">
      <Card title={`매출처 Top ${filters.topN} (실매출금액)`}>
        <ApexChart type="bar" height={Math.max(180, s.length * 36)}
          series={[{ name: '매출', data: s.map(r => Math.round(r['실매출금액'] / 1e4)) }]}
          options={baseOpts({
            colors: [COLORS[0]], plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
            xaxis: { categories: s.map(r => r['매출처']), labels: { formatter: (v: any) => fmt.억(v * 1e4) } },
            yaxis: { labels: { style: { fontSize: '11px' }, maxWidth: 140 } },
            tooltip: { y: { formatter: (v: any) => fmt.num(v * 1e4) + '원' } },
          })}
        />
      </Card>
      <Card title={`매출처 Top ${filters.topN} (실이익금액)`}>
        <ApexChart type="bar" height={Math.max(180, p.length * 36)}
          series={[{ name: '이익', data: p.map(r => Math.round((r['실이익금액'] ?? 0) / 1e4)) }]}
          options={baseOpts({
            colors: [COLORS[1]], plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
            xaxis: { categories: p.map(r => r['매출처']), labels: { formatter: (v: any) => fmt.억(v * 1e4) } },
            yaxis: { labels: { style: { fontSize: '11px' }, maxWidth: 140 } },
            tooltip: { y: { formatter: (v: any) => fmt.num(v * 1e4) + '원' } },
          })}
        />
      </Card>
      <Card title="매출처 연도별 비교">
        <ApexChart type="bar" height={280}
          series={allYears.map(y => ({
            name: y,
            data: allCusts.map(c => {
              const row = data.by_year.find(r => r['연도'] === y && r['매출처'] === c);
              return row ? Math.round(row['실매출금액'] / 1e4) : 0;
            }),
          }))}
          options={baseOpts({
            colors: COLORS, plotOptions: { bar: { borderRadius: 3, columnWidth: '70%' } },
            xaxis: { categories: allCusts, labels: { rotate: -35, style: { fontSize: '10px' } } },
            yaxis: { labels: { formatter: (v: any) => fmt.억(v * 1e4) } },
            legend: { position: 'top', fontSize: '12px' },
            tooltip: { y: { formatter: (v: any) => fmt.num(v * 1e4) + '원' } },
          })}
        />
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
