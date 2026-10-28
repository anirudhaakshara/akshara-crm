import * as React from "react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  /** Accessible table fallback shown behind a "View as table" disclosure. */
  table?: { columns: string[]; rows: (string | number)[][] };
  className?: string;
}

export function ChartCard({ title, subtitle, action, children, table, className }: ChartCardProps) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
      {table && table.rows.length > 0 && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-[11px] font-semibold text-muted-foreground hover:text-foreground">
            View as table
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="text-muted-foreground">
                <tr>
                  {table.columns.map((c) => (
                    <th key={c} className="py-1 pr-3 font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {table.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((v, j) => (
                      <td key={j} className="py-1 pr-3 tabular-nums">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}

export function ChartTooltipBox({ title, rows }: { title?: string; rows: { label: string; value: string; color?: string; dashed?: boolean }[] }) {
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg text-popover-foreground">
      {title && <p className="text-[11px] font-semibold mb-1">{title}</p>}
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {r.color && (
                <span
                  className="inline-block h-2 w-2 rounded-sm"
                  style={r.dashed ? { border: `1.5px dashed ${r.color}` } : { background: r.color }}
                  aria-hidden
                />
              )}
              {r.label}
            </span>
            <span className="font-semibold tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
