'use client';
import { useEffect, useState } from 'react';
import ApexChart, { baseOpts, COLORS } from '@/components/ApexChart';
import { api, fmt } from '@/lib/api';
import type { Filters, RepRecord } from '@/types';

export default function RepsTab({ filters }: { filters: Filters }) {
  const [data, setData] = useState<{ summary: RepRecord[]; top_n: RepRecord[]; by_year: RepRecord[] } | null>(null);

  useEffect(() => {
    setData(null);
    api.reps(filters).then(setData).catch(console.error);
  }, [filters]);

  if (!data) return <Loading />;

  const top = data.top_n;
  const allYears = [...new Set(data.by_year.map(r => r['연도']))].sort() as string[];

  return (
    <div className="space-y-2 pb-4">
      <Card title={`담당자별 실매출금액 Top ${filters.topN}`}>
        <ApexChart type="bar" height={240}
          series={[{ name: '매출', data: top.map(r => Math.round(r.sales / 1e4)) }]}
          options={baseOpts({
            colors: [COLORS[0]], plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
            xaxis: { categories: top.map(r => r['담당자']), labels: { style: { fontSize: '11px' } } },
            yaxis: { labels: { formatter: (v: any) => fmt.억(v * 1e4) } },
            tooltip: { y: { formatter: (v: any) => fmt.억(v * 1e4) } },
          })}
        />
      </Card>
      <Card title="담당자별 매출 vs 이익">
        <ApexChart type="scatter" height={260}
          series={[{ name: '담당자', data: data.summary.map(r => ({ x: Math.round(r.sales / 1e4), y: Math.round(r.profit / 1e4) })) }]}
          options={baseOpts({
            colors: [COLORS[3]],
            xaxis: { title: { text: '매출(만원)' }, labels: { formatter: (v: any) => fmt.억(v * 1e4) } },
            yaxis: { title: { text: '이익(만원)' }, labels: { formatter: (v: any) => fmt.억(v * 1e4) } },
            tooltip: { custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
              const r = data.summary[dataPointIndex];
              return `<div class="p-2 text-xs"><b>${r['담당자']}</b><br/>매출: ${fmt.억(r.sales)}<br/>이익: ${fmt.억(r.profit)}<br/>이익율: ${fmt.pct(r.avg_margin)}</div>`;
            }},
          })}
        />
      </Card>
      <Card title="담당자 연도별 비교">
        <ApexChart type="bar" height={260}
          series={allYears.map(y => ({
            name: y,
            data: top.map(rep => {
              const row = data.by_year.find(r => r['연도'] === y && r['담당자'] === rep['담당자']);
              return row ? Math.round(row['실매출금액' as keyof RepRecord] as number / 1e4) : 0;
            }),
          }))}
          options={baseOpts({
            colors: COLORS, plotOptions: { bar: { borderRadius: 3, columnWidth: '70%' } },
            xaxis: { categories: top.map(r => r['담당자']), labels: { style: { fontSize: '11px' } } },
            yaxis: { labels: { formatter: (v: any) => fmt.억(v * 1e4) } },
            legend: { position: 'top', fontSize: '12px' },
            tooltip: { y: { formatter: (v: any) => fmt.억(v * 1e4) } },
          })}
        />
      </Card>
      <Card title="담당자 상세">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50">{['담당자','건수','총매출','총이익','이익율'].map(h => <th key={h} className="px-3 py-2 text-left font-bold text-gray-500 whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {data.summary.map(r => (
                <tr key={r['담당자']} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-semibold">{r['담당자']}</td>
                  <td className="px-3 py-2">{fmt.num(r.count)}</td>
                  <td className="px-3 py-2">{fmt.억(r.sales)}</td>
                  <td className="px-3 py-2">{fmt.억(r.profit)}</td>
                  <td className="px-3 py-2">{fmt.pct(r.avg_margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
