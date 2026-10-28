"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltipBox } from "@/components/charts/ChartCard";

interface Datum {
  label: string;
  value: number;
  detail?: string;
}

interface SimpleBarChartProps {
  data: Datum[];
  valueLabel: string;
  formatValue: (v: number) => string;
  formatAxis?: (v: number) => string;
  horizontal?: boolean;
  height?: number;
}

/** Single-series bar chart (one hue; the title names the series, so no legend). */
export function SimpleBarChart({ data, valueLabel, formatValue, formatAxis, horizontal = false, height = 240 }: SimpleBarChartProps) {
  const tooltip = (
    <Tooltip
      cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
      content={({ active, payload }) => {
        const row = (active && payload?.[0]?.payload) as Datum | undefined;
        if (!row) return null;
        return (
          <ChartTooltipBox
            title={row.label}
            rows={[
              { label: valueLabel, value: formatValue(row.value), color: "var(--series-1)" },
              ...(row.detail ? [{ label: "", value: row.detail }] : []),
            ]}
          />
        );
      }}
    />
  );

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {horizontal ? (
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={formatAxis ?? formatValue} allowDecimals={false} tickLine={false} />
            <YAxis type="category" dataKey="label" width={84} tickLine={false} axisLine={false} interval={0} />
            {tooltip}
            <Bar dataKey="value" fill="var(--series-1)" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false} />
          </BarChart>
        ) : (
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} interval={0} />
            <YAxis tickFormatter={formatAxis ?? formatValue} width={56} tickLine={false} axisLine={false} />
            {tooltip}
            <Bar dataKey="value" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
