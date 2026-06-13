'use client';
import type { TabId } from '@/types';

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'yearly',    icon: '📅', label: '연도별' },
  { id: 'customers', icon: '🏥', label: '매출처' },
  { id: 'mfr',       icon: '🏭', label: '제조사' },
  { id: 'reps',      icon: '👤', label: '담당자' },
  { id: 'products',  icon: '📦', label: '제품' },
  { id: 'entry',     icon: '➕', label: '입력' },
];

interface Props { active: TabId; onChange: (id: TabId) => void; }

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[62px] bg-white border-t border-gray-200 flex z-50">
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors
            ${active === t.id ? 'text-[#6366F1]' : 'text-gray-400'}`}
        >
          <span className={`text-xl ${active === t.id ? 'scale-110' : ''} transition-transform`}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
