import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { RadarChart } from "@mui/x-charts/RadarChart";
import { Gauge, gaugeClasses } from "@mui/x-charts/Gauge";
import { BarChart3 } from "lucide-react";
import { CHART, CHART_SERIES } from "../lib/theme";
import { EmptyState } from "./ui";

const AXIS = { fontSize: 11, fill: CHART.axis } as const;

/** Consistent placeholder when a chart has no data to show. */
function NoData({ height }: { height: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <EmptyState title="No data yet" hint="Data will appear here once it's logged." Icon={BarChart3} />
    </div>
  );
}

/** Radial gauge for a single 0–100 score. */
export function ScoreGauge({
  value,
  color,
  height = 160,
}: {
  value: number | null;
  color: string;
  height?: number;
}) {
  return (
    <Gauge
      value={value ?? 0}
      valueMax={100}
      height={height}
      startAngle={-110}
      endAngle={110}
      text={({ value: v }) => (value == null ? "—" : `${v}`)}
      sx={{
        [`& .${gaugeClasses.valueText}`]: { fontSize: 22, fontWeight: 700, fill: "#1e293b" },
        [`& .${gaugeClasses.valueArc}`]: { fill: color },
        [`& .${gaugeClasses.referenceArc}`]: { fill: "#e2e8f0" },
      }}
    />
  );
}

/** Line/area chart for a single time series (e.g. monthly emissions). */
export function TrendLine({
  labels,
  values,
  color = CHART.env,
  height = 260,
  area = true,
  valueLabel = "Value",
}: {
  labels: string[];
  values: number[];
  color?: string;
  height?: number;
  area?: boolean;
  valueLabel?: string;
}) {
  if (labels.length === 0) return <NoData height={height} />;
  const gradId = "trend-grad";
  return (
    <LineChart
      height={height}
      hideLegend
      xAxis={[{ data: labels, scaleType: "point", tickLabelStyle: AXIS }]}
      yAxis={[{ tickLabelStyle: AXIS }]}
      series={[{ data: values, label: valueLabel, color, area, showMark: true, curve: "monotoneX" }]}
      grid={{ horizontal: true }}
      margin={{ left: 12, right: 12, top: 16, bottom: 24 }}
      sx={{ "& .MuiAreaElement-root": { fill: `url(#${gradId})` } }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
    </LineChart>
  );
}

export interface RadarSeries {
  label: string;
  data: number[];
  color?: string;
}

/** Multi-axis radar chart — great for comparing entities across E/S/G pillars. */
export function Radar({
  metrics,
  series,
  height = 300,
  max,
}: {
  metrics: string[];
  series: RadarSeries[];
  height?: number;
  max?: number;
}) {
  if (series.length === 0) return <NoData height={height} />;
  return (
    <RadarChart
      height={height}
      radar={{ metrics, max }}
      series={series.map((s, i) => ({
        label: s.label,
        data: s.data,
        color: s.color ?? CHART_SERIES[i % CHART_SERIES.length],
        fillArea: true,
        hideMark: true,
      }))}
      margin={{ top: 24, bottom: 24, left: 24, right: 24 }}
      sx={{ "& .MuiRadarSeriesArea-area": { fillOpacity: 0.12 } }}
    />
  );
}

/** Vertical bar chart with optional per-bar colors. */
export function RankBar({
  categories,
  values,
  colors,
  color = CHART.esg,
  height = 260,
  max,
  valueLabel = "Value",
}: {
  categories: string[];
  values: number[];
  colors?: string[];
  color?: string;
  height?: number;
  max?: number;
  valueLabel?: string;
}) {
  if (categories.length === 0) return <NoData height={height} />;
  return (
    <BarChart
      height={height}
      hideLegend
      xAxis={[
        {
          data: categories,
          scaleType: "band",
          tickLabelStyle: AXIS,
          colorMap: colors
            ? { type: "ordinal", values: categories, colors }
            : undefined,
        },
      ]}
      yAxis={[{ max, tickLabelStyle: AXIS }]}
      series={[{ data: values, label: valueLabel, color }]}
      borderRadius={6}
      grid={{ horizontal: true }}
      margin={{ left: 12, right: 12, top: 16, bottom: 28 }}
    />
  );
}

/** Horizontal bar chart, useful for leaderboards and rankings. */
export function HBar({
  categories,
  values,
  color = CHART.social,
  height = 280,
  valueLabel = "Value",
}: {
  categories: string[];
  values: number[];
  color?: string;
  height?: number;
  valueLabel?: string;
}) {
  if (categories.length === 0) return <NoData height={height} />;
  return (
    <BarChart
      height={height}
      layout="horizontal"
      hideLegend
      yAxis={[{ data: categories, scaleType: "band", tickLabelStyle: AXIS, width: 110 }]}
      xAxis={[{ tickLabelStyle: AXIS }]}
      series={[{ data: values, label: valueLabel, color }]}
      borderRadius={6}
      grid={{ vertical: true }}
      margin={{ left: 12, right: 16, top: 12, bottom: 24 }}
    />
  );
}

/** Grouped bar chart comparing two series across categories. */
export function CompareBar({
  categories,
  seriesA,
  seriesB,
  height = 260,
  max,
}: {
  categories: string[];
  seriesA: { label: string; data: number[]; color?: string };
  seriesB: { label: string; data: number[]; color?: string };
  height?: number;
  max?: number;
}) {
  if (categories.length === 0) return <NoData height={height} />;
  return (
    <BarChart
      height={height}
      xAxis={[{ data: categories, scaleType: "band", tickLabelStyle: AXIS }]}
      yAxis={[{ max, tickLabelStyle: AXIS }]}
      series={[
        { data: seriesA.data, label: seriesA.label, color: seriesA.color ?? CHART.slate },
        { data: seriesB.data, label: seriesB.label, color: seriesB.color ?? CHART.env },
      ]}
      borderRadius={6}
      grid={{ horizontal: true }}
      margin={{ left: 12, right: 12, top: 24, bottom: 28 }}
    />
  );
}

export interface Slice {
  label: string;
  value: number;
  color?: string;
}

/** Donut/pie chart for categorical breakdowns. */
export function Donut({
  data,
  height = 240,
  innerRadius = 55,
  hideLegend = false,
}: {
  data: Slice[];
  height?: number;
  innerRadius?: number;
  hideLegend?: boolean;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <NoData height={height} />;
  return (
    <PieChart
      height={height}
      hideLegend={hideLegend}
      series={[
        {
          innerRadius,
          paddingAngle: 2,
          cornerRadius: 4,
          highlightScope: { fade: "global", highlight: "item" },
          data: data.map((d, i) => ({
            id: i,
            value: d.value,
            label: d.label,
            color: d.color ?? CHART_SERIES[i % CHART_SERIES.length],
          })),
        },
      ]}
      margin={{ top: 8, bottom: 8, left: 8, right: 8 }}
    />
  );
}
