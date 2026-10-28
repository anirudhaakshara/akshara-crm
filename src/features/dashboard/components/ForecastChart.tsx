"use client";

import React from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltipBox } from "@/components/charts/ChartCard";
import { formatINR, formatINRCompact } from "@/lib/formatters";
import type { DashboardStats } from "@/features/dashboard/types";

type Row = DashboardStats["forecast"]["months"][number];

const SERIES = [
  { key: "actual", label: "Won revenue (actual)", color: "var(--series-1)" },
  { key: "trend", label: "Trend (linear fit)", color: "var(--series-2)" },
  { key: "projected", label: "Projected trend", color: "var(--series-2)", dashed: true },
  { key: "expected", label: "Expected from pipeline", color: "var(--series-3)" },
] as const;

/**
 * Won revenue per month (bars) vs the fitted trend (solid) and its 3-month projection (dashed),
 * plus the probability-weighted pipeline for this month and next. One ₹ axis.
 */
export function ForecastChart({ months }: { months: Row[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={months} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} interval="preserveStartEnd" minTickGap={8} />
          <YAxis tickFormatter={(v: number) => formatINRCompact(v)} width={56} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
            content={({ active, payload }) => {
              const row = (active && payload?.[0]?.payload) as Row | undefined;
              if (!row) return null;
              const rows = SERIES.filter((s) => row[s.key] !== null && !(s.key === "trend" && row.projected !== null && row.trend === null)).map(
                (s) => ({
                  label: s.key === "actual" && row.isCurrent ? "Won so far" : s.label,
                  value: formatINR(row[s.key] as number),
                  color: s.color,
                  dashed: "dashed" in s,
                })
              );
              return <ChartTooltipBox title={row.label + (row.isCurrent ? " (this month)" : "")} rows={rows} />;
            }}
          />
          <Legend verticalAlign="top" iconSize={12} wrapperStyle={{ paddingBottom: 8, lineHeight: "18px" }} />
          <Bar dataKey="actual" name="Won revenue (actual)" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          <Bar dataKey="expected" name="Expected from pipeline" fill="var(--series-3)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          <Line dataKey="trend" name="Trend (linear fit)" legendType="plainline" stroke="var(--series-2)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
          <Line
            dataKey="projected"
            name="Projected trend"
            legendType="plainline"
            stroke="var(--series-2)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={{ r: 3, strokeWidth: 0, fill: "var(--series-2)" }}
            isAnimationActive={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
