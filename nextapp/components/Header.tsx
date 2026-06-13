'use client';
interface Props {
  filterCount: number;
  topN: number;
  onFilterOpen: () => void;
  onTopNChange: (n: number) => void;
}

export default function Header({ filterCount, topN, onFilterOpen, onTopNChange }: Props) {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[#6366F1] text-white flex items-center justify-between px-4 z-50 shadow-lg">
      <button
        onClick={onFilterOpen}
        className="flex items-center gap-1.5 bg-white/20 rounded-lg px-3 py-1.5 text-sm font-semibold"
      >
        ⚙ 필터
        {filterCount > 0 && (
          <span className="bg-red-500 text-white rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center">
            {filterCount}
          </span>
        )}
      </button>

      <span className="font-bold text-[17px] tracking-tight">📊 영업 실적</span>

      <select
        value={topN}
        onChange={e => onTopNChange(Number(e.target.value))}
        className="bg-white/20 border-none text-white text-xs font-semibold rounded-lg px-2 py-1.5 cursor-pointer"
      >
        {[5, 10, 15, 20].map(n => (
          <option key={n} value={n} className="text-gray-800 bg-white">Top {n}</option>
        ))}
      </select>
    </header>
  );
}
