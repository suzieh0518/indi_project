'use client';
import { useEffect, useState } from 'react';
import ApexChart, { baseOpts, COLORS } from '@/components/ApexChart';
import { api, fmt } from '@/lib/api';
import type { Filters, ManufacturerRecord } from '@/types';

export default function MfrTab({ filters }: { filters: Filters }) {
  const [data, setData] = useState<{ by_manufacturer: ManufacturerRecord[]; by_supplier: ManufacturerRecord[]; pie: ManufacturerRecord[] } | null>(null);

  useEffect(() => {
    setData(null);
    api.manufacturers(filters).then(setData).catch(console.error);
  }, [filters]);

  if (!data) return <Loading />;

  const m = [...data.by_manufacturer].reverse();
  const s = [...data.by_supplier].reverse();

  return (
    <div className="space-y-2 pb-4">
      <Card title={`제조사 Top ${filters.topN}`}>
        <ApexChart type="bar" height={Math.max(180, m.length * 36)}
          series={[{ name: '매출', data: m.map(r => Math.round(r['실매출금액'] / 1e4)) }]}
          options={baseOpts({
            colors: [COLORS[4]], plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
            xaxis: { categories: m.map(r => r['제조사']), labels: { formatter: (v: any) => fmt.억(v * 1e4) } },
            yaxis: { labels: { style: { fontSize: '11px' }, maxWidth: 140 } },
            tooltip: { y: { formatter: (v: any) => fmt.num(v * 1e4) + '원' } },
          })}
        />
      </Card>
      <Card title={`매입처 Top ${filters.topN}`}>
        <ApexChart type="bar" height={Math.max(180, s.length * 36)}
          series={[{ name: '매출', data: s.map(r => Math.round(r['실매출금액'] / 1e4)) }]}
          options={baseOpts({
            colors: [COLORS[2]], plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
            xaxis: { categories: s.map(r => r['매입처']), labels: { formatter: (v: any) => fmt.억(v * 1e4) } },
            yaxis: { labels: { style: { fontSize: '11px' }, maxWidth: 140 } },
            tooltip: { y: { formatter: (v: any) => fmt.num(v * 1e4) + '원' } },
          })}
        />
      </Card>
      <Card title="제조사 매출 비중 Top 10">
        <ApexChart type="pie" height={280}
          series={data.pie.map(r => Math.round(r['실매출금액']))}
          options={{ colors: COLORS, labels: data.pie.map(r => r['제조사'] as string), legend: { position: 'bottom', fontSize: '11px' }, tooltip: { y: { formatter: (v: any) => fmt.num(v) + '원' } }, dataLabels: { enabled: true } }}
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
