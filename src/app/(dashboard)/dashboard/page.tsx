"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  CheckSquare,
  FileText,
  IndianRupee,
  Mail,
  Percent,
  Phone,
  RefreshCw,
  Scale,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartCard } from "@/components/charts/ChartCard";
import { useToast } from "@/components/feedback/Toast";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatDate, formatDateTime, formatINR, formatINRCompact } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { STAGE_LABELS, type DealStageValue } from "@/features/deals/schemas/deal";
import { SOURCE_LABELS, type ContactSourceValue } from "@/features/contacts/constants";
import { PriorityBadge } from "@/features/tasks/components/PriorityBadge";
import { TaskToggle } from "@/features/tasks/components/TaskToggle";
import { ForecastChart } from "@/features/dashboard/components/ForecastChart";
import { SimpleBarChart } from "@/features/dashboard/components/SimpleBarChart";
import type { DashboardStats } from "@/features/dashboard/types";

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  icon: LucideIcon;
  href?: string;
  tone?: "danger";
}) {
  const body = (
    <div className="h-full rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", tone === "danger" ? "text-red-600 dark:text-red-400" : "text-muted-foreground")} aria-hidden />
      </div>
      <p className={cn("mt-1.5 text-xl font-bold tabular-nums", tone === "danger" ? "text-red-600 dark:text-red-400" : "text-foreground")}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
      {body}
    </Link>
  ) : (
    body
  );
}

const ACTIVITY_ICONS = { CALL: Phone, EMAIL: Mail, MEETING: Calendar, NOTE: FileText } as const;

export default function DashboardPage() {
  const { data: session } = useSession();
  const toast = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setStats(await apiFetch<DashboardStats>("/api/dashboard/stats"));
    } catch (err) {
      toast.error(errorMessage(err, "Failed to load dashboard"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !stats) {
    return (
      <div className="space-y-6 animate-pulse" aria-busy="true">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-80 rounded-xl bg-muted" />
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-xl bg-muted" />
          <div className="h-64 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  const { kpis, forecast } = stats;
  const scope = stats.scope === "ALL" ? "Whole team" : "Your accounts";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {session?.user?.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {scope} · updated {formatDateTime(stats.generatedAt)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true);
            load();
          }}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="Open pipeline" value={formatINRCompact(kpis.openPipelineValue)} hint={`${kpis.openDeals} open deals`} icon={IndianRupee} href="/deals" />
        <Kpi
          label="Weighted pipeline"
          value={formatINRCompact(kpis.weightedPipeline)}
          hint={kpis.scoredOpenDeals < kpis.openDeals ? `${kpis.scoredOpenDeals}/${kpis.openDeals} deals scored` : "Value × win probability"}
          icon={Scale}
        />
        <Kpi
          label="Won this month"
          value={formatINRCompact(kpis.wonThisMonthValue)}
          hint={`${kpis.wonThisMonthCount} deal${kpis.wonThisMonthCount === 1 ? "" : "s"} · ${forecast.currentMonth.label}`}
          icon={Trophy}
        />
        <Kpi
          label="Win rate"
          value={kpis.winRate === null ? "—" : `${Math.round(kpis.winRate * 100)}%`}
          hint={`${kpis.closedLast12Months} closed, last 12 months`}
          icon={Percent}
        />
        <Kpi label="Open tasks" value={String(kpis.openTasks)} hint="Follow-ups to do" icon={CheckSquare} href="/tasks" />
        <Kpi
          label="Overdue tasks"
          value={String(kpis.overdueTasks)}
          hint={kpis.overdueTasks ? "Needs attention" : "All on track"}
          icon={AlertTriangle}
          href="/tasks"
          tone={kpis.overdueTasks ? "danger" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          className="lg:col-span-2"
          title="Won revenue: actual vs projected"
          subtitle="Last 12 months, linear trend projected 3 months ahead, plus probability-weighted pipeline"
          table={{
            columns: ["Month", "Won", "Trend", "Projected", "Expected (pipeline)"],
            rows: forecast.months.map((m) => [
              m.label + (m.isCurrent ? " *" : ""),
              m.actual === null ? "—" : formatINR(m.actual),
              m.trend === null ? "—" : formatINR(m.trend),
              m.projected === null ? "—" : formatINR(m.projected),
              m.expected === null ? "—" : formatINR(m.expected),
            ]),
          }}
        >
          <ForecastChart months={forecast.months} />
        </ChartCard>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-foreground">Revenue forecast</h2>
          {[forecast.currentMonth, forecast.nextMonth].map((m, i) => (
            <div key={m.label} className="rounded-lg border border-border p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Expected {i === 0 ? "this month" : "next month"} · {m.label}
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums">{formatINR(m.expected)}</p>
              <p className="text-[11px] text-muted-foreground">
                from {formatINR(m.pipeline)} of open deals closing then
                {m.unscored > 0 && ` (${m.unscored} not yet scored)`}
              </p>
            </div>
          ))}
          <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
            <p>
              <span className="font-semibold text-foreground">Weighted pipeline:</span> {formatINR(kpis.weightedPipeline)}
            </p>
            <p>
              <span className="font-semibold text-foreground">Trend:</span>{" "}
              {forecast.trendSlopePerMonth >= 0 ? "+" : "−"}
              {formatINR(Math.abs(forecast.trendSlopePerMonth))} per month
            </p>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Open pipeline by stage"
          subtitle="Total value of open deals in each stage"
          table={{
            columns: ["Stage", "Deals", "Value"],
            rows: stats.pipelineByStage.map((s) => [STAGE_LABELS[s.stage as DealStageValue], s.count, formatINR(s.value)]),
          }}
        >
          {kpis.openDeals === 0 ? (
            <EmptyState title="No open deals" description="Create a deal to start building your pipeline." />
          ) : (
            <SimpleBarChart
              data={stats.pipelineByStage.map((s) => ({
                label: STAGE_LABELS[s.stage as DealStageValue],
                value: s.value,
                detail: `${s.count} deal${s.count === 1 ? "" : "s"}`,
              }))}
              valueLabel="Value"
              formatValue={formatINR}
              formatAxis={formatINRCompact}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Leads by source"
          subtitle="Contacts by how they found us"
          table={{
            columns: ["Source", "Contacts"],
            rows: stats.leadsBySource.map((s) => [SOURCE_LABELS[s.source as ContactSourceValue] ?? s.source, s.count]),
          }}
        >
          {stats.leadsBySource.length === 0 ? (
            <EmptyState title="No contacts yet" />
          ) : (
            <SimpleBarChart
              horizontal
              data={stats.leadsBySource.map((s) => ({ label: SOURCE_LABELS[s.source as ContactSourceValue] ?? s.source, value: s.count }))}
              valueLabel="Contacts"
              formatValue={(v) => String(v)}
            />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <CalendarClock className="h-4 w-4 text-primary" />
              My tasks: due today &amp; overdue
            </h2>
            <Link href="/tasks" className="text-xs text-primary hover:underline">
              All tasks
            </Link>
          </div>
          {stats.myTasks.length === 0 ? (
            <EmptyState icon={CheckSquare} title="Nothing due today" description="You're all caught up." />
          ) : (
            <ul className="divide-y divide-border">
              {stats.myTasks.map((t) => (
                <li key={t.id} className={cn("flex items-start gap-3 py-2.5", t.overdue && "bg-destructive/5 -mx-2 px-2 rounded-lg")}>
                  <div className="pt-0.5">
                    <TaskToggle taskId={t.id} status="OPEN" onChanged={() => setTimeout(load, 400)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground">{t.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      <span className={cn(t.overdue && "font-semibold text-destructive")}>
                        {t.overdue ? "Overdue · " : "Due today · "}
                        {formatDate(t.dueDate)}
                      </span>
                      {t.deal && (
                        <>
                          {" · "}
                          <Link href={`/deals/${t.deal.id}`} className="hover:text-primary">
                            {t.deal.title}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <PriorityBadge priority={t.priority} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-foreground">Recent activity</h2>
          {stats.recentActivities.length === 0 ? (
            <EmptyState title="No activity yet" description="Log a call, email or meeting from a contact or deal." />
          ) : (
            <ul className="divide-y divide-border">
              {stats.recentActivities.map((a) => {
                const Icon = ACTIVITY_ICONS[a.type];
                return (
                  <li key={a.id} className="flex items-start gap-3 py-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50">
                      <Icon className="h-3 w-3 text-muted-foreground" aria-label={a.type.toLowerCase()} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">{a.subject}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {a.user.name} · {formatDateTime(a.occurredAt)}
                        {a.deal ? (
                          <>
                            {" · "}
                            <Link href={`/deals/${a.deal.id}`} className="hover:text-primary">
                              {a.deal.title}
                            </Link>
                          </>
                        ) : a.contact ? (
                          <>
                            {" · "}
                            <Link href={`/contacts/${a.contact.id}`} className="hover:text-primary">
                              {a.contact.firstName} {a.contact.lastName}
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
