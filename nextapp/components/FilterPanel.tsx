'use client';
import { useState, useEffect } from 'react';
import type { FilterOptions, Filters } from '@/types';

interface Props {
  open: boolean;
  options: FilterOptions | null;
  filters: Filters;
  onClose: () => void;
  onApply: (f: Filters) => void;
}

export default function FilterPanel({ open, options, filters, onClose, onApply }: Props) {
  const [local, setLocal] = useState<Filters>(filters);

  useEffect(() => { setLocal(filters); }, [filters, open]);

  function toggle(key: keyof Pick<Filters, 'years'|'customers'|'manufacturers'|'suppliers'|'reps'>, val: string) {
    setLocal(f => {
      const arr = f[key] as string[];
      return { ...f, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  }

  function reset() {
    setLocal({ years: [], customers: [], manufacturers: [], suppliers: [], reps: [], topN: filters.topN });
  }

  const groups: { label: string; key: keyof Pick<Filters,'years'|'customers'|'manufacturers'|'suppliers'|'reps'>; values: string[] }[] = options ? [
    { label: '연도', key: 'years', values: options.years },
    { label: '매출처', key: 'customers', values: options.customers },
    { label: '제조사', key: 'manufacturers', values: options.manufacturers },
    { label: '매입처', key: 'suppliers', values: options.suppliers },
    { label: '담당자', key: 'reps', values: options.reps },
  ] : [];

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/45 z-[60]" onClick={onClose} />}
      <div className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto z-[61] transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold">🔍 필터</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg">✕</button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {groups.map(g => (
            <div key={g.key}>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">{g.label}</p>
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                {g.values.map(v => {
                  const selected = (local[g.key] as string[]).includes(v);
                  return (
                    <button
                      key={v}
                      onClick={() => toggle(g.key, v)}
                      className={`px-3 py-1.5 rounded-full text-[13px] border-[1.5px] transition-colors
                        ${selected ? 'bg-[#6366F1] border-[#6366F1] text-white' : 'border-gray-200 text-gray-700'}`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 grid grid-cols-3 gap-3">
          <button onClick={reset} className="col-span-1 py-3 border-[1.5px] border-gray-200 rounded-xl text-sm font-semibold text-gray-500">초기화</button>
          <button onClick={() => { onApply(local); onClose(); }} className="col-span-2 py-3 bg-[#6366F1] text-white rounded-xl text-sm font-bold">적용하기</button>
        </div>
      </div>
    </>
  );
}
