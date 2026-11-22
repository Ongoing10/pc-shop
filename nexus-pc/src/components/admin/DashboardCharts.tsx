import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { useAppTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../utils/format';
import type { OrderStatus } from '../../types/admin';
import type { DailyStat } from '../../utils/adminStats';
import { t } from '../../i18n/t';

/**
 * Màu biểu đồ lấy từ token của chế độ đang chọn. Mọi biểu đồ ở đây chỉ có MỘT chuỗi dữ liệu nên dùng một màu.
 * Chuỗi dùng primaryActive thay cho primary: trên nền card tối #19191c, #e85b0d nằm trong dải sáng và đủ tương phản 3:1
 * (#ff6b1a sáng quá); trên nền trắng, #c94e0a đủ 3:1 còn #ea5f12 hơi nhạt.
 */
const useChartColors = () => {
  const { colors } = useAppTheme();
  return {
    series: colors.primaryActive,
    grid: colors.border,
    axis: colors.textMuted,
    axisStrong: colors.textSecondary,
    cursor: colors.backgroundInput,
    crosshair: colors.borderLight,
    dotRing: colors.backgroundElevated,
  };
};

/** Tiền rút gọn cho trục: 1,2 tỷ · 35 tr · 900 k */
export const formatMoneyShort = (v: number) => {
  if (Math.abs(v) >= 1e9) return t('admin.dashboard.billionShort', '{{value}} tỷ', { value: (v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) });
  if (Math.abs(v) >= 1e6) return t('admin.dashboard.millionShort', '{{value}} tr', { value: (v / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) });
  if (Math.abs(v) >= 1e3) return `${Math.round(v / 1e3)} k`;
  return String(v);
};

const ChartTooltip: React.FC<{ title: React.ReactNode; value: React.ReactNode }> = ({ title, value }) => (
  <div className="admin-chart-tooltip">
    <small>{title}</small>
    <b>{value}</b>
  </div>
);

// ---------------------------------------------------------------------------------------------------------------
// Doanh thu / số đơn theo ngày: một thước đo mỗi lần (không vẽ hai trục y)
// ---------------------------------------------------------------------------------------------------------------

export type TrendMetric = 'revenue' | 'orders';

export const DailyTrendChart: React.FC<{ data: DailyStat[]; metric: TrendMetric; height?: number }> = ({
  data,
  metric,
  height = 280,
}) => {
  const CHART = useChartColors();
  const AXIS_TICK = { fill: CHART.axis, fontSize: 12 };
  const isRevenue = metric === 'revenue';
  const valueText = (v: number) => (isRevenue ? formatCurrency(v) : t('admin.dashboard.orders', '{{v}} đơn', { v }));
  const total = data.reduce((s, d) => s + d[metric], 0);
  // Khoảng dài thì thưa nhãn ngày cho khỏi chồng chữ
  const tickGap = data.length > 45 ? 48 : 24;

  const tooltip = (
    <Tooltip
      cursor={isRevenue ? { stroke: CHART.crosshair, strokeWidth: 1 } : { fill: CHART.cursor }}
      content={({ active, payload, label }) =>
        active && payload?.length ? (
          <ChartTooltip
            title={dayjs(String(label)).locale('vi').format('dddd, DD/MM/YYYY')}
            value={valueText(Number(payload[0].value))}
          />
        ) : null
      }
    />
  );
  const xAxis = (
    <XAxis
      dataKey="date"
      tickFormatter={(d: string) => dayjs(d).format('DD/MM')}
      tick={AXIS_TICK}
      tickLine={false}
      axisLine={{ stroke: CHART.grid }}
      minTickGap={tickGap}
    />
  );
  const yAxis = (
    <YAxis
      tickFormatter={(v: number) => (isRevenue ? formatMoneyShort(v) : String(v))}
      tick={AXIS_TICK}
      tickLine={false}
      axisLine={false}
      allowDecimals={false}
      width={isRevenue ? 56 : 32}
    />
  );
  const grid = <CartesianGrid vertical={false} stroke={CHART.grid} />;

  return (
    <div
      className="admin-chart"
      role="img"
      aria-label={t('admin.dashboard.byDayTotal', '{{value}} theo ngày, tổng {{value2}}', { value: isRevenue ? t('admin.common.revenue', 'Doanh thu') : t('admin.dashboard.orders2', 'Số đơn'), value2: valueText(total) })}
    >
      <ResponsiveContainer width="100%" height={height}>
        {isRevenue ? (
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="admin-trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.series} stopOpacity={0.28} />
                <stop offset="100%" stopColor={CHART.series} stopOpacity={0} />
              </linearGradient>
            </defs>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={CHART.series}
              strokeWidth={2}
              fill="url(#admin-trend-fill)"
              activeDot={{ r: 5, stroke: CHART.dotRing, strokeWidth: 2, fill: CHART.series }}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            <Bar dataKey="orders" fill={CHART.series} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Cột ngang dùng chung: đơn theo trạng thái, doanh thu theo danh mục
// ---------------------------------------------------------------------------------------------------------------

interface HBarDatum {
  key: string;
  label: string;
  value: number;
}

const HorizontalBarChart: React.FC<{
  data: HBarDatum[];
  valueText: (v: number) => string;
  tickText?: (v: number) => string;
  onSelect?: (key: string) => void;
  ariaLabel: string;
  labelWidth?: number;
}> = ({ data, valueText, tickText, onSelect, ariaLabel, labelWidth = 116 }) => {
  const CHART = useChartColors();
  const AXIS_TICK = { fill: CHART.axis, fontSize: 12 };
  return (
  <div className="admin-chart" role="img" aria-label={ariaLabel}>
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34 + 32)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={8}>
        <CartesianGrid horizontal={false} stroke={CHART.grid} />
        <XAxis
          type="number"
          tickFormatter={tickText}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={labelWidth}
          tick={{ ...AXIS_TICK, fill: CHART.axisStrong }}
          tickLine={false}
          axisLine={{ stroke: CHART.grid }}
        />
        <Tooltip
          cursor={{ fill: CHART.cursor }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <ChartTooltip
                title={(payload[0].payload as HBarDatum).label}
                value={valueText(Number(payload[0].value))}
              />
            ) : null
          }
        />
        <Bar
          dataKey="value"
          fill={CHART.series}
          radius={[0, 4, 4, 0]}
          maxBarSize={16}
          isAnimationActive={false}
          cursor={onSelect ? 'pointer' : undefined}
          onClick={onSelect ? (_, index) => onSelect(data[index].key) : undefined}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
  );
};

export const OrderStatusChart: React.FC<{
  data: Array<{ status: OrderStatus; label: string; count: number }>;
  onSelect: (status: OrderStatus) => void;
}> = ({ data, onSelect }) => (
  <HorizontalBarChart
    data={data.map((d) => ({ key: String(d.status), label: d.label, value: d.count }))}
    valueText={(v) => t('admin.dashboard.orders', '{{v}} đơn', { v })}
    onSelect={(key) => onSelect(Number(key) as OrderStatus)}
    ariaLabel={t('admin.dashboard.ordersByStatus', 'Số đơn theo trạng thái: {{value}}', { value: data.map((d) => `${d.label} ${d.count}`).join(', ') })}
  />
);

export const CategoryRevenueChart: React.FC<{ data: Array<{ code: string; label: string; revenue: number }> }> = ({
  data,
}) => (
  <HorizontalBarChart
    data={data.map((d) => ({ key: d.code, label: d.label, value: d.revenue }))}
    valueText={formatCurrency}
    tickText={formatMoneyShort}
    ariaLabel={t('admin.dashboard.revenueByCategory', 'Doanh thu theo danh mục: {{amount}}', { amount: data.map((d) => `${d.label} ${formatCurrency(d.revenue)}`).join(', ') })}
    labelWidth={104}
  />
);
