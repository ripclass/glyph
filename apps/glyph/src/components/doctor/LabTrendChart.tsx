"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** A single data point for a lab value. */
export interface LabDataPoint {
  /** ISO date of the lab result. */
  date: string;
  /** Numeric value. */
  value: number;
}

/** Configuration for a lab test to chart. */
export interface LabTrend {
  /** Unique ID. */
  id: string;
  /** Test name, e.g., "HbA1c". */
  testName: string;
  /** Unit string, e.g., "%". */
  unit: string;
  /** Data points over time. */
  dataPoints: LabDataPoint[];
  /** Lower bound of reference range. */
  refLow: number;
  /** Upper bound of reference range. */
  refHigh: number;
}

export interface LabTrendChartProps {
  /** Lab trends to display. */
  trends: LabTrend[];
  /** Which trend is currently selected (by ID). */
  selectedTrendId?: string;
  /** Called when the user selects a different trend. */
  onSelectTrend?: (id: string) => void;
  className?: string;
}

/** SVG chart dimensions. */
const CHART_WIDTH = 480;
const CHART_HEIGHT = 200;
const PADDING = { top: 20, right: 30, bottom: 30, left: 50 };
const PLOT_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

/**
 * Lab value trends over time as a simple SVG line chart.
 *
 * Features:
 * - Line chart showing values like HbA1c, creatinine across lab reports
 * - Reference range displayed as a shaded band (green zone)
 * - Abnormal values highlighted with red dots
 * - Tab selector for switching between lab tests
 * - Responsive with horizontal scroll on mobile
 * - Pure SVG -- no external chart library needed
 *
 * @example
 * ```tsx
 * <LabTrendChart
 *   trends={patientLabTrends}
 *   selectedTrendId="hba1c"
 *   onSelectTrend={(id) => setSelectedTrend(id)}
 * />
 * ```
 */
export function LabTrendChart({
  trends,
  selectedTrendId,
  onSelectTrend,
  className,
}: LabTrendChartProps) {
  const [activeId, setActiveId] = React.useState(
    selectedTrendId ?? trends[0]?.id ?? ""
  );

  const activeTrend = trends.find((t) => t.id === activeId);

  const handleSelectTrend = (id: string) => {
    setActiveId(id);
    onSelectTrend?.(id);
  };

  if (trends.length === 0) {
    return (
      <div className={cn("py-8 text-center", className)}>
        <p className="text-sm text-slate-400">No lab trends available</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Trend selector tabs */}
      <div className="flex flex-wrap gap-1">
        {trends.map((trend) => (
          <button
            key={trend.id}
            type="button"
            onClick={() => handleSelectTrend(trend.id)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition",
              activeId === trend.id
                ? "bg-glyph-100 text-glyph-800"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            )}
          >
            {trend.testName}
          </button>
        ))}
      </div>

      {/* Chart */}
      {activeTrend && <TrendChart trend={activeTrend} />}
    </div>
  );
}

/**
 * SVG line chart for a single lab trend.
 */
function TrendChart({ trend }: { trend: LabTrend }) {
  const { dataPoints, refLow, refHigh, testName, unit } = trend;

  if (dataPoints.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-lg border border-slate-200 bg-white">
        <p className="text-xs text-slate-400">No data points for {testName}</p>
      </div>
    );
  }

  // Compute value range (include reference range)
  const allValues = dataPoints.map((d) => d.value);
  const valueMin = Math.min(...allValues, refLow) * 0.9;
  const valueMax = Math.max(...allValues, refHigh) * 1.1;
  const valueRange = valueMax - valueMin || 1;

  // Compute time range
  const times = dataPoints.map((d) => new Date(d.date).getTime());
  const timeMin = Math.min(...times);
  const timeMax = Math.max(...times);
  const timeRange = timeMax - timeMin || 1;

  // Scale functions
  const scaleX = (dateStr: string): number => {
    const t = new Date(dateStr).getTime();
    return PADDING.left + ((t - timeMin) / timeRange) * PLOT_WIDTH;
  };

  const scaleY = (val: number): number => {
    return PADDING.top + PLOT_HEIGHT - ((val - valueMin) / valueRange) * PLOT_HEIGHT;
  };

  // Build polyline points
  const sortedPoints = [...dataPoints].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const linePoints = sortedPoints
    .map((d) => `${scaleX(d.date)},${scaleY(d.value)}`)
    .join(" ");

  // Reference range band Y coordinates
  const refBandTop = scaleY(refHigh);
  const refBandBottom = scaleY(refLow);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-2">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full min-w-[400px]"
        role="img"
        aria-label={`${testName} trend chart`}
      >
        {/* Reference range band */}
        <rect
          x={PADDING.left}
          y={refBandTop}
          width={PLOT_WIDTH}
          height={Math.max(refBandBottom - refBandTop, 0)}
          fill="#dcfce7"
          stroke="#bbf7d0"
          strokeWidth="0.5"
        />

        {/* Reference range labels */}
        <text
          x={PADDING.left - 4}
          y={refBandTop}
          textAnchor="end"
          className="fill-green-600 text-[9px]"
          dominantBaseline="middle"
        >
          {refHigh}
        </text>
        <text
          x={PADDING.left - 4}
          y={refBandBottom}
          textAnchor="end"
          className="fill-green-600 text-[9px]"
          dominantBaseline="middle"
        >
          {refLow}
        </text>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((frac) => {
          const y = PADDING.top + PLOT_HEIGHT * frac;
          return (
            <line
              key={frac}
              x1={PADDING.left}
              y1={y}
              x2={PADDING.left + PLOT_WIDTH}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="0.5"
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Data line */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="#475569"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {sortedPoints.map((d, i) => {
          const isAbnormal = d.value < refLow || d.value > refHigh;
          const cx = scaleX(d.date);
          const cy = scaleY(d.value);

          return (
            <g key={i}>
              <circle
                cx={cx}
                cy={cy}
                r={isAbnormal ? 4 : 3}
                fill={isAbnormal ? "#ef4444" : "#475569"}
                stroke="white"
                strokeWidth="1.5"
              />
              {/* Value label */}
              <text
                x={cx}
                y={cy - 8}
                textAnchor="middle"
                className={cn(
                  "text-[9px]",
                  isAbnormal ? "fill-red-600 font-bold" : "fill-slate-500"
                )}
              >
                {d.value}
              </text>
            </g>
          );
        })}

        {/* X-axis date labels */}
        {sortedPoints.map((d, i) => (
          <text
            key={i}
            x={scaleX(d.date)}
            y={CHART_HEIGHT - 5}
            textAnchor="middle"
            className="fill-slate-400 text-[8px]"
          >
            {formatChartDate(d.date)}
          </text>
        ))}

        {/* Y-axis label */}
        <text
          x={12}
          y={CHART_HEIGHT / 2}
          textAnchor="middle"
          transform={`rotate(-90, 12, ${CHART_HEIGHT / 2})`}
          className="fill-slate-400 text-[9px]"
        >
          {testName} ({unit})
        </text>

        {/* Axes */}
        <line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={PADDING.top + PLOT_HEIGHT}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        <line
          x1={PADDING.left}
          y1={PADDING.top + PLOT_HEIGHT}
          x2={PADDING.left + PLOT_WIDTH}
          y2={PADDING.top + PLOT_HEIGHT}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

/**
 * Format a date for chart axis display.
 */
function formatChartDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}
