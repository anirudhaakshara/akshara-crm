"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Flame, Snowflake, Thermometer, HelpCircle, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatImpact, topFactors } from "@/lib/ml/explain";
import { scoreBand, type ScoreBand, type StoredScoreFactors } from "@/features/ml/types";

interface WinScoreBadgeProps {
  stage: string;
  winProbability: number | null;
  scoreFactors?: StoredScoreFactors | null;
  className?: string;
}

const BAND_STYLES: Record<ScoreBand, { label: string; icon: typeof Flame; cls: string }> = {
  HOT: { label: "Hot", icon: Flame, cls: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400" },
  WARM: { label: "Warm", icon: Thermometer, cls: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400" },
  COLD: { label: "Cold", icon: Snowflake, cls: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400" },
};

const TOOLTIP_WIDTH = 280;

/**
 * Hot (≥70%) / Warm (40–69%) / Cold (<40%) win-probability badge.
 * Hover, focus or tap shows the top positive and negative factors in plain English.
 */
export function WinScoreBadge({ stage, winProbability, scoreFactors, className }: WinScoreBadgeProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const tooltipId = useId();

  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const above = r.bottom + 240 > window.innerHeight && r.top > 240;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - TOOLTIP_WIDTH / 2), window.innerWidth - TOOLTIP_WIDTH - 8);
    setPos({ top: above ? r.top - 8 : r.bottom + 8, left, above });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, place]);

  if (stage === "WON" || stage === "LOST") return null;

  const hasScore = winProbability !== null && winProbability !== undefined;
  const band = hasScore ? scoreBand(winProbability) : null;
  const style = band ? BAND_STYLES[band] : null;
  const Icon = style?.icon ?? HelpCircle;
  const pct = hasScore ? Math.round(winProbability * 100) : null;
  const { positive, negative } = topFactors(scoreFactors?.factors ?? []);

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        aria-label={hasScore ? `${style!.label} deal, ${pct}% win probability. Show factors.` : "Win probability: not enough data"}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          style ? style.cls : "border-border bg-muted/60 text-muted-foreground",
          className
        )}
      >
        <Icon className="h-3 w-3" aria-hidden />
        {hasScore ? `${style!.label} ${pct}%` : "Not enough data"}
      </button>

      {open && pos &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: TOOLTIP_WIDTH,
              transform: pos.above ? "translateY(-100%)" : undefined,
            }}
            className="z-[60] rounded-xl border border-border bg-popover p-3 text-left shadow-xl text-popover-foreground pointer-events-none"
          >
            {hasScore ? (
              <>
                <p className="text-xs font-bold">
                  {pct}% likely to win · {style!.label}
                </p>
                {positive.length > 0 && (
                  <div className="mt-2">
                    <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <TrendingUp className="h-3 w-3" aria-hidden /> Helping
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {positive.map((f) => (
                        <li key={f.group} className="flex justify-between gap-3 text-[11px]">
                          <span>{f.label}</span>
                          <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{formatImpact(f.impact)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {negative.length > 0 && (
                  <div className="mt-2">
                    <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <TrendingDown className="h-3 w-3" aria-hidden /> Hurting
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {negative.map((f) => (
                        <li key={f.group} className="flex justify-between gap-3 text-[11px]">
                          <span>{f.label}</span>
                          <span className="font-semibold tabular-nums text-rose-700 dark:text-rose-400">{formatImpact(f.impact)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Impact vs. a typical deal, from the model trained on closed deals.
                </p>
              </>
            ) : (
              <p className="text-[11px]">
                No score yet. A score appears once a model has been trained on at least 30 closed deals.
              </p>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
