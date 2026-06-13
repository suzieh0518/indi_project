'use client';
import { useState, useEffect } from 'react';
import { api, fmt } from '@/lib/api';
import type { FilterOptions } from '@/types';

export default function EntryTab() {
  const [opts, setOpts] = useState<FilterOptions | null>(null);
  const [form, setForm] = useState({
    year: '2025', supplier: '', newSupplier: '', manufacturer: '', newManufacturer: '',
    customer: '', newCustomer: '', invLoc: '', rep: '',
    product: '', spec: '', insCode: '',
    refPrice: 0, qty: 1, unitPrice: 0, actualUnitPrice: 0, actualUnitPurch: 0,
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { api.options().then(setOpts).catch(console.error); }, []);

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const salesAmt = form.unitPrice * form.qty;
  const actSales = form.actualUnitPrice * form.qty;
  const actPurch = form.actualUnitPurch * form.qty;
  const actProfit = actSales - actPurch;
  const profitRate = actSales > 0 ? (actProfit / actSales * 100) : 0;
  const refSales = form.refPrice * form.qty;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product.trim()) { showToast('❌ 제품명은 필수입니다'); return; }
    setSaving(true);
    try {
      const res = await api.entry({
        year: form.year,
        supplier: form.newSupplier.trim() || form.supplier,
        manufacturer: form.newManufacturer.trim() || form.manufacturer,
        customer: form.newCustomer.trim() || form.customer,
        inv_loc: form.invLoc.trim() || '',
        product: form.product.trim(),
        spec: form.spec.trim(),
        ins_code: form.insCode.trim(),
        ref_price: form.refPrice, qty: form.qty,
        unit_price: form.unitPrice,
        actual_unit_price: form.actualUnitPrice,
        actual_unit_purch: form.actualUnitPurch,
        rep: form.rep,
      });
      showToast(`✅ ${form.year}년 데이터에 저장되었습니다 (순번 ${res.seq})`);
      setForm(f => ({ ...f, product: '', spec: '', insCode: '', refPrice: 0, qty: 1, unitPrice: 0, actualUnitPrice: 0, actualUnitPurch: 0 }));
    } catch (err) {
      showToast('❌ 저장 실패: ' + (err instanceof Error ? err.message : ''));
    } finally { setSaving(false); }
  }

  if (!opts) return <div className="flex items-center justify-center h-40 text-gray-400 text-sm gap-2"><span className="w-5 h-5 border-2 border-gray-200 border-t-[#6366F1] rounded-full animate-spin" />불러오는 중...</div>;

  return (
    <div className="pb-6">
      {toast && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-white text-sm font-medium shadow-lg whitespace-nowrap transition-all ${toast.startsWith('✅') ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}>
          {toast}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Section title="기본 정보">
          <div className="grid grid-cols-2 gap-3">
            <Field label="연도 *">
              <select className={input} value={form.year} onChange={e => set('year', e.target.value)}>
                {['2025','2024','2023'].map(y => <option key={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="수량 *">
              <input className={input} type="number" min={1} value={form.qty} onChange={e => set('qty', +e.target.value)} />
            </Field>
          </div>
          <Field label="매입처 *">
            <select className={input} value={form.supplier} onChange={e => set('supplier', e.target.value)}>
              {opts.suppliers.map(v => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="매입처 직접입력 (신규)">
            <input className={input} placeholder="신규일 때만" value={form.newSupplier} onChange={e => set('newSupplier', e.target.value)} />
          </Field>
          <Field label="제조사 *">
            <select className={input} value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)}>
              {opts.manufacturers.map(v => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="제조사 직접입력 (신규)">
            <input className={input} placeholder="신규일 때만" value={form.newManufacturer} onChange={e => set('newManufacturer', e.target.value)} />
          </Field>
          <Field label="매출처 *">
            <select className={input} value={form.customer} onChange={e => set('customer', e.target.value)}>
              {opts.customers.map(v => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="매출처 직접입력 (신규)">
            <input className={input} placeholder="신규일 때만" value={form.newCustomer} onChange={e => set('newCustomer', e.target.value)} />
          </Field>
          <Field label="재고적용처">
            <input className={input} placeholder="매출처와 같으면 비워도 됩니다" value={form.invLoc} onChange={e => set('invLoc', e.target.value)} />
          </Field>
          <Field label="담당자 *">
            <select className={input} value={form.rep} onChange={e => set('rep', e.target.value)}>
              {opts.reps.map(v => <option key={v}>{v}</option>)}
            </select>
          </Field>
        </Section>

        <Section title="제품 정보">
          <Field label="제품명 *">
            <input className={input} required placeholder="필수 입력" value={form.product} onChange={e => set('product', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="규격"><input className={input} value={form.spec} onChange={e => set('spec', e.target.value)} /></Field>
            <Field label="보험코드"><input className={input} value={form.insCode} onChange={e => set('insCode', e.target.value)} /></Field>
          </div>
        </Section>

        <Section title="단가 정보">
          <div className="grid grid-cols-2 gap-3">
            <Field label="기준가"><input className={input} type="number" min={0} value={form.refPrice} onChange={e => set('refPrice', +e.target.value)} /></Field>
            <Field label="매출단가"><input className={input} type="number" min={0} value={form.unitPrice} onChange={e => set('unitPrice', +e.target.value)} /></Field>
            <Field label="실매출단가"><input className={input} type="number" min={0} value={form.actualUnitPrice} onChange={e => set('actualUnitPrice', +e.target.value)} /></Field>
            <Field label="실매입단가"><input className={input} type="number" min={0} value={form.actualUnitPurch} onChange={e => set('actualUnitPurch', +e.target.value)} /></Field>
          </div>
        </Section>

        <Section title="자동 계산 미리보기">
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
            {[
              ['매출금액', salesAmt], ['실매출금액', actSales], ['실매입금액', actPurch],
              ['실이익금액', actProfit],
            ].map(([label, val]) => (
              <div key={label as string} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                <span className="font-bold text-[#6366F1]">{fmt.num(val as number)}원</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-gray-200 pt-1.5">
              <span className="text-gray-500">실이익율</span>
              <span className="font-bold text-[#6366F1]">{profitRate.toFixed(2)}%</span>
            </div>
          </div>
        </Section>

        <div className="mx-3 mt-2">
          <button type="submit" disabled={saving} className="w-full py-4 bg-[#6366F1] text-white text-base font-bold rounded-2xl disabled:opacity-60">
            {saving ? '저장 중...' : '💾 저장'}
          </button>
        </div>
      </form>
    </div>
  );
}

const input = 'w-full px-3 py-3 border-[1.5px] border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#6366F1] bg-white';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white mx-3 mt-2 rounded-2xl p-4 shadow-sm">
      <p className="text-sm font-bold mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}
