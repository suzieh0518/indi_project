'use client';
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false }) as any;

export const COLORS = ['#6366F1','#10B981','#F59E0B','#3B82F6','#8B5CF6','#EF4444','#06B6D4','#F97316'];

export const baseOpts = (extra: ApexOptions = {}): ApexOptions => ({
  chart: { toolbar: { show: false }, fontFamily: 'inherit', ...extra.chart },
  tooltip: { style: { fontSize: '12px' } },
  dataLabels: { enabled: false },
  grid: { borderColor: '#E2E8F0', strokeDashArray: 3 },
  ...extra,
});

interface Props { options: ApexOptions; series: ApexAxisChartSeries | number[]; type: string; height?: number; }

export default function ApexChart({ options, series, type, height = 240 }: Props) {
  return (
    <ReactApexChart
      options={{ ...options, chart: { ...options.chart, height } }}
      series={series}
      type={type}
      height={height}
      width="100%"
    />
  );
}
