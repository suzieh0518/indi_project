export interface FilterOptions {
  years: string[];
  customers: string[];
  manufacturers: string[];
  suppliers: string[];
  reps: string[];
  min_sales: number;
  max_sales: number;
}

export interface Filters {
  years: string[];
  customers: string[];
  manufacturers: string[];
  suppliers: string[];
  reps: string[];
  topN: number;
}

export interface KPI {
  total_sales: number;
  total_profit: number;
  avg_margin: number;
  total_qty: number;
  total_count: number;
}

export interface YearlyRecord {
  연도: string;
  sales: number;
  profit: number;
  avg_margin: number;
  count: number;
  qty: number;
}

export interface CustomerRecord {
  매출처: string;
  실매출금액: number;
  실이익금액?: number;
  연도?: string;
}

export interface ManufacturerRecord {
  제조사?: string;
  매입처?: string;
  실매출금액: number;
}

export interface RepRecord {
  담당자: string;
  sales: number;
  profit: number;
  count: number;
  avg_margin: number;
  연도?: string;
}

export interface ProductRecord {
  제품명: string;
  실매출금액?: number;
  수량?: number;
}

export interface MarginHistRecord {
  x: string;
  y: number;
}

export type TabId = 'yearly' | 'customers' | 'mfr' | 'reps' | 'products' | 'entry';
