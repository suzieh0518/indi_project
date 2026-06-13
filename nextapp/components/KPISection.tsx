'use client';
import type { KPI } from '@/types';
import { fmt } from '@/lib/api';

interface Props { kpi: KPI | null; loading: boolean; }

export default function KPISection({ kpi, loading }: Props) {
  if (loading || !kpi) {
    return (
      <div className="grid grid-cols-2 gap-2.5 px-3 pt-3 pb-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`bg-white rounded-2xl p-4 shadow-sm animate-pulse h-16 ${i === 0 ? 'col-span-2' : ''}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 px-3 pt-3 pb-2">
      <div className="col-span-2 bg-white rounded-2xl px-5 py-3 shadow-sm flex justify-between items-center">
        <div>
          <p className="text-[11px] text-gray-400 font-medium">총 매출금액</p>
          <p className="text-2xl font-bold text-[#6366F1]">{fmt.억(kpi.total_sales)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-400 font-medium">총 이익금액</p>
          <p className="text-2xl font-bold text-[#10B981]">{fmt.억(kpi.total_profit)}</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-[11px] text-gray-400 font-medium mb-1">평균 이익율</p>
        <p className="text-xl font-bold text-[#F59E0B]">{fmt.pct(kpi.avg_margin)}</p>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-[11px] text-gray-400 font-medium mb-1">총 판매수량</p>
        <p className="text-xl font-bold">{fmt.num(kpi.total_qty)}개</p>
      </div>
      <div className="col-span-2 bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center">
        <p className="text-[11px] text-gray-400 font-medium">거래 건수</p>
        <p className="text-xl font-bold">{fmt.num(kpi.total_count)}건</p>
      </div>
    </div>
  );
}
