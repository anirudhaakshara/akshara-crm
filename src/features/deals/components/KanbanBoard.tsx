"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CalendarClock, GripVertical, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatINR, formatINRCompact } from "@/lib/formatters";
import { STAGE_LABELS, type DealStageValue } from "@/features/deals/schemas/deal";
import { STAGE_ACCENTS } from "@/features/deals/components/StageBadge";
import type { BoardColumn, DealRecord } from "@/features/deals/types";
import { WinScoreBadge } from "@/features/ml/components/WinScoreBadge";

interface KanbanBoardProps {
  columns: BoardColumn[];
  loading?: boolean;
  /** Called when a card is dropped on a different column. */
  onMove: (deal: DealRecord, toStage: DealStageValue) => void;
  showOwner?: boolean;
}

function DealCardBody({ deal, showOwner, dragging }: { deal: DealRecord; showOwner?: boolean; dragging?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-3 shadow-sm space-y-2 text-left",
        dragging && "shadow-2xl ring-2 ring-primary/40 rotate-1"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/deals/${deal.id}`}
          className="text-xs font-semibold text-foreground hover:text-primary leading-snug line-clamp-2"
          onClick={(e) => dragging && e.preventDefault()}
        >
          {deal.title}
        </Link>
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-hidden />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-foreground">{formatINR(deal.value)}</span>
        <WinScoreBadge stage={deal.stage} winProbability={deal.winProbability} scoreFactors={deal.scoreFactors} />
      </div>
      <div className="space-y-0.5 text-[11px] text-muted-foreground">
        {deal.contact && (
          <p className="truncate">
            {deal.contact.firstName} {deal.contact.lastName}
            {deal.company ? ` · ${deal.company.name}` : ""}
          </p>
        )}
        <p className="flex items-center gap-1">
          <CalendarClock className="h-3 w-3" />
          {deal.closedAt ? `Closed ${formatDate(deal.closedAt)}` : `Close ${formatDate(deal.expectedCloseDate)}`}
        </p>
        {showOwner && deal.owner && (
          <p className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {deal.owner.name}
          </p>
        )}
      </div>
    </div>
  );
}

function DraggableDeal({ deal, showOwner }: { deal: DealRecord; showOwner?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-roledescription="Draggable deal card"
      aria-label={`${deal.title}, ${formatINR(deal.value)}. Press space to pick up and arrow keys to move between stages.`}
      className={cn("select-none touch-manipulation cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl", isDragging && "opacity-30")}
    >
      <DealCardBody deal={deal} showOwner={showOwner} />
    </div>
  );
}

function Column({ column, showOwner }: { column: BoardColumn; showOwner?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.stage });
  const hidden = column.count - column.deals.length;

  return (
    <div data-stage={column.stage} className="flex w-72 shrink-0 flex-col rounded-2xl border border-border bg-muted/30">
      <div className="p-3 border-b border-border space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", STAGE_ACCENTS[column.stage])} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{STAGE_LABELS[column.stage]}</h3>
            <span className="rounded-full bg-background border border-border px-1.5 text-[10px] font-semibold text-muted-foreground">
              {column.count}
            </span>
          </div>
          <span className="text-xs font-bold text-foreground" title={formatINR(column.total)}>
            {formatINRCompact(column.total)}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">{formatINR(column.total)}</p>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[160px] max-h-[calc(100vh-320px)] overflow-y-auto p-2 space-y-2 transition-colors rounded-b-2xl",
          isOver && "bg-primary/5 ring-2 ring-inset ring-primary/30"
        )}
      >
        {column.deals.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border text-[11px] text-muted-foreground">
            Drop deals here
          </div>
        ) : (
          column.deals.map((deal) => <DraggableDeal key={deal.id} deal={deal} showOwner={showOwner} />)
        )}
        {hidden > 0 && (
          <Link
            href={`/deals?view=table&stage=${column.stage}`}
            className="block py-2 text-center text-[11px] font-semibold text-primary hover:underline"
          >
            +{hidden} more — view in table
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Drop on the column under the pointer (what users expect); fall back to overlap for keyboard drags.
 */
const pointerFirst: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

export function KanbanBoard({ columns, loading, onMove, showOwner }: KanbanBoardProps) {
  const [active, setActive] = useState<DealRecord | null>(null);

  const sensors = useSensors(
    // Small distance so clicks on the title link still navigate.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Long-press on touch so the board can still be scrolled horizontally.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  function handleDragStart(e: DragStartEvent) {
    setActive((e.active.data.current as { deal: DealRecord } | undefined)?.deal ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActive(null);
    const deal = (e.active.data.current as { deal: DealRecord } | undefined)?.deal;
    const toStage = e.over?.id as DealStageValue | undefined;
    if (!deal || !toStage || toStage === deal.stage) return;
    onMove(deal, toStage);
  }

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-72 shrink-0 rounded-2xl border border-border bg-muted/30 p-3 space-y-3 animate-pulse">
            <div className="h-4 w-24 rounded bg-muted" />
            {Array.from({ length: 3 }).map((__, j) => (
              <div key={j} className="h-24 rounded-xl bg-muted" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerFirst}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActive(null)}
      accessibility={{
        announcements: {
          onDragStart: ({ active: a }) => `Picked up deal ${(a.data.current as { deal: DealRecord })?.deal.title ?? ""}`,
          onDragOver: ({ over }) => (over ? `Over ${STAGE_LABELS[over.id as DealStageValue]}` : "Not over a stage"),
          onDragEnd: ({ over }) => (over ? `Dropped in ${STAGE_LABELS[over.id as DealStageValue]}` : "Dropped"),
          onDragCancel: () => "Move cancelled",
        },
      }}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x md:snap-none">
        {columns.map((column) => (
          <div key={column.stage} className="snap-start">
            <Column column={column} showOwner={showOwner} />
          </div>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className="w-[264px]">
            <DealCardBody deal={active} showOwner={showOwner} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
