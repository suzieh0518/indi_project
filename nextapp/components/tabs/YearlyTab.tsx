'use client';
import { useEffect, useState } from 'react';
import ApexChart, { baseOpts, COLORS } from '@/components/ApexChart';
import { api, fmt } from '@/lib/api';
import type { Filters, YearlyRecord } from '@/types';

export default function YearlyTab({ filters }: { filters: Filters }) {
  const [data, setData] = useState<YearlyRecord[] | null>(null);

  useEffect(() => {
    setData(null);
    api.yearly(filters).then(setData).catch(console.error);
  }, [filters]);

  if (!data) return <div className="flex items-center justify-center h-40 text-gray-400 text-sm gap-2"><span className="w-5 h-5 border-2 border-gray-200 border-t-[#6366F1] rounded-full animate-spin" />불러오는 중...</div>;

  const years = data.map(r => r['연도']);

  return (
    <div className="space-y-2 pb-4">
      <Card title="연도별 매출 vs 이익">
        <ApexChart
          type="bar" height={240}
          series={[
            { name: '매출', data: data.map(r => Math.round(r.sales / 1e4)) },
            { name: '이익', data: data.map(r => Math.round(r.profit / 1e4)) },
          ]}
          options={baseOpts({
            colors: [COLORS[0], COLORS[1]],
            xaxis: { categories: years },
            yaxis: { labels: { formatter: (v: any) => fmt.억(v * 1e4) } },
            tooltip: { y: { formatter: (v: any) => fmt.억(v * 1e4) } },
            plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
            legend: { position: 'top' },
          })}
        />
      </Card>
      <Card title="연도별 평균 이익율">
        <ApexChart
          type="line" height={200}
          series={[{ name: '이익율', data: data.map(r => +r.avg_margin.toFixed(2)) }]}
          options={baseOpts({
            colors: [COLORS[2]],
            xaxis: { categories: years },
            yaxis: { labels: { formatter: (v: any) => v.toFixed(1) + '%' } },
            markers: { size: 6 },
            stroke: { curve: 'smooth', width: 3 },
            tooltip: { y: { formatter: (v: any) => v.toFixed(2) + '%' } },
          })}
        />
      </Card>
      <Card title="연도별 상세">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50">{['연도','건수','수량','총매출','총이익','이익율'].map(h => <th key={h} className="px-3 py-2 text-left font-bold text-gray-500 whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {data.map(r => (
                <tr key={r['연도']} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-semibold">{r['연도']}</td>
                  <td className="px-3 py-2">{fmt.num(r.count)}</td>
                  <td className="px-3 py-2">{fmt.num(r.qty)}</td>
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
  return (
    <div className="bg-white mx-3 rounded-2xl p-4 shadow-sm">
      <p className="text-sm font-bold mb-3">{title}</p>
      {children}
    </div>
  );
}
