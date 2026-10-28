"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BrainCircuit, CheckCircle2, Database, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartCard, ChartTooltipBox } from "@/components/charts/ChartCard";
import { useToast } from "@/components/feedback/Toast";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { featureLabel } from "@/features/ml/components/featureLabels";
import type { StoredMetrics, StoredWeights } from "@/features/ml/types";

interface ModelVersionRow {
  id: string;
  trainedAt: string;
  isActive: boolean;
  metrics: StoredMetrics;
}

interface ModelResponse {
  active: (ModelVersionRow & { weights: StoredWeights }) | null;
  history: ModelVersionRow[];
  data: {
    closedDeals: number;
    wonDeals: number;
    lostDeals: number;
    openDeals: number;
    scoredOpenDeals: number;
    minClosedDeals: number;
    enoughData: boolean;
  };
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ConfusionMatrixView({ cm }: { cm: StoredMetrics["confusionMatrix"] }) {
  const max = Math.max(cm.tp, cm.fp, cm.tn, cm.fn, 1);
  const cell = (value: number, label: string, correct: boolean) => (
    <div
      className="relative flex flex-col items-center justify-center rounded-lg border border-border p-3 text-center"
      style={{ background: `hsl(var(--primary) / ${0.08 + 0.42 * (value / max)})` }}
    >
      <span className="text-xl font-bold tabular-nums text-foreground">{value}</span>
      <span className="text-[10px] text-foreground/80">{label}</span>
      {correct && <CheckCircle2 className="absolute right-1.5 top-1.5 h-3 w-3 text-foreground/60" aria-label="correct" />}
    </div>
  );
  return (
    <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-xs">
      <div />
      <p className="text-center text-[11px] font-semibold text-muted-foreground">Predicted won</p>
      <p className="text-center text-[11px] font-semibold text-muted-foreground">Predicted lost</p>
      <p className="self-center text-right text-[11px] font-semibold text-muted-foreground pr-1">Actually won</p>
      {cell(cm.tp, "true positive", true)}
      {cell(cm.fn, "false negative", false)}
      <p className="self-center text-right text-[11px] font-semibold text-muted-foreground pr-1">Actually lost</p>
      {cell(cm.fp, "false positive", false)}
      {cell(cm.tn, "true negative", true)}
    </div>
  );
}

export default function ModelInsightsPage() {
  const toast = useToast();
  const [data, setData] = useState<ModelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<ModelResponse>("/api/ml/model"));
    } catch (err) {
      toast.error(errorMessage(err, "Failed to load model"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function retrain() {
    setTraining(true);
    try {
      const res = await apiFetch<{ metrics: StoredMetrics; rescoredOpenDeals: number }>("/api/ml/train", { method: "POST" });
      toast.success(`Model retrained — test accuracy ${pct(res.metrics.accuracy)}, ${res.rescoredOpenDeals} open deals rescored`);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Training failed"));
    } finally {
      setTraining(false);
    }
  }

  const importance = useMemo(() => {
    if (!data?.active) return [];
    const w = data.active.weights;
    return w.columns
      .map((c, i) => ({ name: featureLabel(c.name), weight: w.weights[i], abs: Math.abs(w.weights[i]) }))
      .sort((a, b) => b.abs - a.abs);
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 rounded bg-muted" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-96 rounded-xl bg-muted" />
      </div>
    );
  }

  const active = data?.active;
  const m = active?.metrics;
  const readiness = data?.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BrainCircuit className="h-6 w-6 text-primary" />
            Model Insights
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Deal win-probability model · logistic regression trained on closed deals (Won = 1, Lost = 0).
          </p>
        </div>
        <Button onClick={retrain} disabled={training || !readiness?.enoughData} className="gap-1.5 shadow-sm">
          {training ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {training ? "Training…" : "Retrain model"}
        </Button>
      </div>

      {readiness && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" />
            {readiness.closedDeals} closed deals ({readiness.wonDeals} won · {readiness.lostDeals} lost)
          </span>
          <span>
            {readiness.scoredOpenDeals} of {readiness.openDeals} open deals scored
          </span>
          {!readiness.enoughData && (
            <span className="flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Need at least {readiness.minClosedDeals} closed deals to train
            </span>
          )}
        </div>
      )}

      {!active || !m ? (
        <EmptyState
          icon={BrainCircuit}
          title="No model trained yet"
          description={
            readiness?.enoughData
              ? "Train the first model to start scoring open deals."
              : "Close more deals as won or lost, then train the model."
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="success">Active</Badge>
            <span>
              Version <code className="font-mono text-foreground">{active.id.slice(-8)}</code> · trained {formatDateTime(active.trainedAt)} ·{" "}
              {m.trainSize} train / {m.testSize} test rows · {m.iterations} iterations
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Metric label="Test accuracy" value={pct(m.accuracy)} hint={`5-fold CV ${pct(m.cvAccuracy)} · train ${pct(m.trainAccuracy)}`} />
            <Metric label="Precision" value={pct(m.precision)} hint="Predicted wins that were won" />
            <Metric label="Recall" value={pct(m.recall)} hint="Actual wins the model caught" />
            <Metric label="ROC AUC" value={m.auc.toFixed(3)} hint={`5-fold CV ${m.cvAuc.toFixed(3)}`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartCard
              title="Confusion matrix"
              subtitle={`Hold-out set of ${m.testSize} deals, threshold 50%`}
              table={{
                columns: ["", "Predicted won", "Predicted lost"],
                rows: [
                  ["Actually won", m.confusionMatrix.tp, m.confusionMatrix.fn],
                  ["Actually lost", m.confusionMatrix.fp, m.confusionMatrix.tn],
                ],
              }}
            >
              <ConfusionMatrixView cm={m.confusionMatrix} />
              <p className="mt-3 text-[11px] text-muted-foreground">
                Baseline (always predict “won”): {pct(m.positiveRate)} accuracy.
              </p>
            </ChartCard>

            <ChartCard
              className="lg:col-span-2"
              title="Feature importance"
              subtitle="Absolute weight on standardised features — bigger bar, bigger influence"
              table={{
                columns: ["Feature", "Weight", "Direction"],
                rows: importance.map((f) => [f.name, f.weight.toFixed(3), f.weight >= 0 ? "Raises win odds" : "Lowers win odds"]),
              }}
            >
              <div style={{ height: Math.max(280, importance.length * 24) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={importance} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }} barCategoryGap={4}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v: number) => v.toFixed(1)} />
                    <YAxis type="category" dataKey="name" width={176} tickLine={false} interval={0} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                      content={({ active: on, payload }) => {
                        const row = on && payload?.[0]?.payload as (typeof importance)[number] | undefined;
                        if (!row) return null;
                        return (
                          <ChartTooltipBox
                            title={row.name}
                            rows={[
                              { label: "Weight", value: row.weight.toFixed(3) },
                              { label: "Effect", value: row.weight >= 0 ? "Raises win odds" : "Lowers win odds" },
                            ]}
                          />
                        );
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      wrapperStyle={{ paddingBottom: 8 }}
                      payload={[
                        { value: "Raises win odds", type: "square", color: "var(--series-1)" },
                        { value: "Lowers win odds", type: "square", color: "var(--series-2)" },
                      ]}
                    />
                    <Bar dataKey="abs" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      {importance.map((f) => (
                        <Cell key={f.name} fill={f.weight >= 0 ? "var(--series-1)" : "var(--series-2)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-bold text-foreground mb-3">Recent versions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Trained</th>
                    <th className="py-2 pr-4">Accuracy</th>
                    <th className="py-2 pr-4">CV accuracy</th>
                    <th className="py-2 pr-4">AUC</th>
                    <th className="py-2 pr-4">Rows</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data?.history.map((v) => (
                    <tr key={v.id} className={cn(v.isActive && "font-semibold")}>
                      <td className="py-2 pr-4 whitespace-nowrap">{formatDateTime(v.trainedAt)}</td>
                      <td className="py-2 pr-4 tabular-nums">{pct(v.metrics.accuracy)}</td>
                      <td className="py-2 pr-4 tabular-nums">{v.metrics.cvAccuracy !== undefined ? pct(v.metrics.cvAccuracy) : "—"}</td>
                      <td className="py-2 pr-4 tabular-nums">{v.metrics.auc.toFixed(3)}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {v.metrics.trainSize}/{v.metrics.testSize}
                      </td>
                      <td className="py-2">{v.isActive ? <Badge variant="success">Active</Badge> : <span className="text-muted-foreground">Archived</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
