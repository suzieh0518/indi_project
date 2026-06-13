'use client';
import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import KPISection from '@/components/KPISection';
import FilterPanel from '@/components/FilterPanel';
import YearlyTab from '@/components/tabs/YearlyTab';
import CustomersTab from '@/components/tabs/CustomersTab';
import MfrTab from '@/components/tabs/MfrTab';
import RepsTab from '@/components/tabs/RepsTab';
import ProductsTab from '@/components/tabs/ProductsTab';
import EntryTab from '@/components/tabs/EntryTab';
import { api } from '@/lib/api';
import type { Filters, FilterOptions, KPI, TabId } from '@/types';

const DEFAULT_FILTERS: Filters = { years: [], customers: [], manufacturers: [], suppliers: [], reps: [], topN: 10 };

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('yearly');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  // Track which tabs have been visited so we don't remount on re-render
  const [visited, setVisited] = useState<Set<TabId>>(new Set(['yearly']));

  useEffect(() => {
    api.options().then(setOptions).catch(console.error);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const loadKPI = useCallback(() => {
    setKpiLoading(true);
    api.kpi(filters).then(d => { setKpi(d); setKpiLoading(false); }).catch(() => setKpiLoading(false));
  }, [filters]);

  useEffect(() => { loadKPI(); }, [loadKPI]);

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    setVisited(v => new Set([...v, tab]));
  }

  function handleApplyFilter(f: Filters) {
    setFilters(f);
    // Reset visited tabs so they reload with new filters
    setVisited(new Set([activeTab]));
  }

  const filterCount = Object.values(filters).flat().filter(v => typeof v === 'string').length;

  const tabProps = { filters };

  return (
    <div className="min-h-screen">
      <Header
        filterCount={filterCount}
        topN={filters.topN}
        onFilterOpen={() => setFilterOpen(true)}
        onTopNChange={n => { setFilters(f => ({ ...f, topN: n })); setVisited(new Set([activeTab])); }}
      />

      <div className="pt-14 pb-16">
        <KPISection kpi={kpi} loading={kpiLoading} />

        <div className="mt-1">
          {activeTab === 'yearly'    && <YearlyTab    key={filters.toString()} {...tabProps} />}
          {activeTab === 'customers' && <CustomersTab key={filters.toString()} {...tabProps} />}
          {activeTab === 'mfr'       && <MfrTab       key={filters.toString()} {...tabProps} />}
          {activeTab === 'reps'      && <RepsTab      key={filters.toString()} {...tabProps} />}
          {activeTab === 'products'  && <ProductsTab  key={filters.toString()} {...tabProps} />}
          {activeTab === 'entry'     && <EntryTab />}
        </div>
      </div>

      <BottomNav active={activeTab} onChange={handleTabChange} />

      <FilterPanel
        open={filterOpen}
        options={options}
        filters={filters}
        onClose={() => setFilterOpen(false)}
        onApply={handleApplyFilter}
      />
    </div>
  );
}
