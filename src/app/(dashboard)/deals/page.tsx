"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Kanban, LayoutGrid, List, Plus, Search, Trash2, Edit2 } from "lucide-react";
import { DataTable, ColumnDef } from "@/components/datatable/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/components/feedback/Toast";
import { apiFetch, errorMessage, Paginated } from "@/lib/api-client";
import { formatDate, formatINR } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useCompanyOptions, useContactOptions, useUserOptions } from "@/hooks/useOptions";
import { DEAL_STAGES, STAGE_LABELS, type DealStageValue } from "@/features/deals/schemas/deal";
import { KanbanBoard } from "@/features/deals/components/KanbanBoard";
import { DealDialog } from "@/features/deals/components/DealDialog";
import { LostReasonDialog } from "@/features/deals/components/LostReasonDialog";
import { StageBadge } from "@/features/deals/components/StageBadge";
import type { BoardColumn, DealRecord } from "@/features/deals/types";

const PAGE_SIZE = 10;

/** Moves a deal between columns, keeping counts and ₹ totals in sync. */
function moveCard(columns: BoardColumn[], deal: DealRecord, toStage: DealStageValue, replacement?: DealRecord) {
  const value = Number(deal.value);
  const moved: DealRecord = replacement ?? { ...deal, stage: toStage };
  return columns.map((c) => {
    if (c.stage === deal.stage && c.stage !== toStage) {
      return { ...c, count: c.count - 1, total: c.total - value, deals: c.deals.filter((d) => d.id !== deal.id) };
    }
    if (c.stage === toStage && c.stage !== deal.stage) {
      return { ...c, count: c.count + 1, total: c.total + Number(moved.value), deals: [moved, ...c.deals] };
    }
    if (c.stage === toStage) {
      return { ...c, deals: c.deals.map((d) => (d.id === deal.id ? moved : d)) };
    }
    return c;
  });
}

function DealsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const toast = useToast();

  const users = useUserOptions(isAdmin);
  const contacts = useContactOptions();
  const companies = useCompanyOptions();

  const view = searchParams.get("view") === "table" ? "table" : "board";
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [stageFilter, setStageFilter] = useState(searchParams.get("stage") ?? "");

  // Board state
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [pendingLost, setPendingLost] = useState<DealRecord | null>(null);
  const [savingLost, setSavingLost] = useState(false);

  // Table state
  const [rows, setRows] = useState<DealRecord[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Keep the stage filter in sync with links like "/deals?view=table&stage=WON".
  const stageParam = searchParams.get("stage");
  useEffect(() => {
    if (stageParam !== null) {
      setStageFilter(stageParam);
      setPage(1);
    }
  }, [stageParam]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  function setView(next: "board" | "table") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    if (next === "board") params.delete("stage");
    router.replace(`${pathname}?${params}`, { scroll: false });
  }

  const fetchBoard = useCallback(async () => {
    setBoardLoading(true);
    try {
      const params = new URLSearchParams({ view: "board" });
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (ownerId) params.set("ownerId", ownerId);
      const res = await apiFetch<{ columns: BoardColumn[] }>(`/api/deals?${params}`);
      setColumns(res.columns);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to load pipeline"));
    } finally {
      setBoardLoading(false);
    }
  }, [debouncedSearch, ownerId, toast]);

  const fetchTable = useCallback(async () => {
    setTableLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sortBy: sortField,
        sortOrder,
      });
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (ownerId) params.set("ownerId", ownerId);
      if (stageFilter === "open" || stageFilter === "closed") params.set("status", stageFilter);
      else if (stageFilter) params.set("stage", stageFilter);
      const res = await apiFetch<Paginated<DealRecord> & { meta: { totalValue: number } }>(`/api/deals?${params}`);
      setRows(res.data);
      setTotalPages(res.meta.totalPages);
      setTotalItems(res.meta.totalItems);
      setTotalValue(res.meta.totalValue);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to load deals"));
    } finally {
      setTableLoading(false);
    }
  }, [page, sortField, sortOrder, debouncedSearch, ownerId, stageFilter, toast]);

  useEffect(() => {
    if (view === "board") fetchBoard();
  }, [view, fetchBoard]);

  useEffect(() => {
    if (view === "table") fetchTable();
  }, [view, fetchTable]);

  const refresh = view === "board" ? fetchBoard : fetchTable;

  /** Optimistic stage change: move the card now, PATCH in the background, roll back on failure. */
  async function commitMove(deal: DealRecord, toStage: DealStageValue, lostReason?: string) {
    setColumns((cols) => moveCard(cols, deal, toStage));
    try {
      const updated = await apiFetch<DealRecord>(`/api/deals/${deal.id}`, {
        method: "PATCH",
        body: JSON.stringify({ stage: toStage, ...(lostReason ? { lostReason } : {}) }),
      });
      // Swap in the server copy (closedAt etc.).
      setColumns((cols) =>
        cols.map((c) => (c.stage === toStage ? { ...c, deals: c.deals.map((d) => (d.id === deal.id ? updated : d)) } : c))
      );
      toast.success(`Moved to ${STAGE_LABELS[toStage]}`);
    } catch (err) {
      setColumns((cols) => moveCard(cols, { ...deal, stage: toStage }, deal.stage, deal));
      toast.error(errorMessage(err, "Could not update stage — change reverted"));
    }
  }

  function handleMove(deal: DealRecord, toStage: DealStageValue) {
    if (toStage === "LOST") {
      setPendingLost(deal);
      return;
    }
    commitMove(deal, toStage);
  }

  async function confirmLost(reason: string) {
    if (!pendingLost) return;
    setSavingLost(true);
    const deal = pendingLost;
    setPendingLost(null);
    await commitMove(deal, "LOST", reason);
    setSavingLost(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/deals/${deleteId}`, { method: "DELETE" });
      toast.success("Deal deleted");
      setDeleteId(null);
      refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete deal"));
    } finally {
      setDeleting(false);
    }
  }

  function handleSort(field: string) {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortOrder(field === "title" ? "asc" : "desc");
    }
  }

  const openTotal = columns.filter((c) => c.stage !== "WON" && c.stage !== "LOST").reduce((s, c) => s + c.total, 0);
  const openCount = columns.filter((c) => c.stage !== "WON" && c.stage !== "LOST").reduce((s, c) => s + c.count, 0);

  const tableColumns: ColumnDef<DealRecord>[] = [
    {
      id: "title",
      header: "Deal",
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col min-w-[160px]">
          <Link href={`/deals/${row.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
            {row.title}
          </Link>
          <span className="text-[11px] text-muted-foreground">
            {row.contact ? `${row.contact.firstName} ${row.contact.lastName}` : "—"}
            {row.company ? ` · ${row.company.name}` : ""}
          </span>
        </div>
      ),
    },
    {
      id: "value",
      header: "Value",
      sortable: true,
      cell: (row) => <span className="font-semibold whitespace-nowrap">{formatINR(row.value)}</span>,
    },
    { id: "stage", header: "Stage", sortable: true, cell: (row) => <StageBadge stage={row.stage} /> },
    {
      id: "expectedCloseDate",
      header: "Expected Close",
      sortable: true,
      cell: (row) => <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(row.expectedCloseDate)}</span>,
    },
    {
      id: "closedAt",
      header: "Closed",
      sortable: true,
      cell: (row) => <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(row.closedAt)}</span>,
    },
    ...(isAdmin
      ? [{ id: "owner", header: "Owner", cell: (row: DealRecord) => <span className="text-xs">{row.owner?.name ?? "—"}</span> }]
      : []),
    {
      id: "actions",
      header: "Actions",
      className: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${row.title}`}
            onClick={() => {
              setEditing(row);
              setDialogOpen(true);
            }}
          >
            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${row.title}`} onClick={() => setDeleteId(row.id)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const ownerSelect = isAdmin ? (
    <Select
      aria-label="Filter by owner"
      className="sm:w-40"
      value={ownerId}
      onChange={(e) => {
        setOwnerId(e.target.value);
        setPage(1);
      }}
    >
      <option value="">All owners</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
        </option>
      ))}
    </Select>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Kanban className="h-6 w-6 text-primary" />
            Deals &amp; Pipeline
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {view === "board"
              ? `${openCount} open deals worth ${formatINR(openTotal)} · drag a card to change its stage`
              : `${totalItems} deals worth ${formatINR(totalValue)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5" role="tablist" aria-label="Deals view">
            {(
              [
                { key: "board", label: "Board", icon: LayoutGrid },
                { key: "table", label: "Table", icon: List },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => setView(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  view === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <Button
            className="gap-1.5 shadow-sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New Deal
          </Button>
        </div>
      </div>

      {view === "board" ? (
        <>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search deals"
                className="pl-9"
                placeholder="Search deal, contact, company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {ownerSelect}
          </div>
          <KanbanBoard columns={columns} loading={boardLoading} onMove={handleMove} showOwner={isAdmin} />
        </>
      ) : (
        <DataTable
          columns={tableColumns}
          data={rows}
          loading={tableLoading}
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          searchTerm={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search deal, contact, company..."
          sortField={sortField}
          sortOrder={sortOrder}
          onSortChange={handleSort}
          emptyMessage="No deals match these filters."
          filterControls={
            <>
              <Select
                aria-label="Filter by stage"
                className="sm:w-40"
                value={stageFilter}
                onChange={(e) => {
                  setStageFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All stages</option>
                <option value="open">Open (not closed)</option>
                <option value="closed">Closed (won + lost)</option>
                {DEAL_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </Select>
              {ownerSelect}
            </>
          }
        />
      )}

      <DealDialog
        open={dialogOpen}
        initialData={editing}
        contacts={contacts}
        companies={companies}
        users={users}
        isAdmin={isAdmin}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSaved={() => refresh()}
      />
      <LostReasonDialog
        open={!!pendingLost}
        dealTitle={pendingLost?.title}
        loading={savingLost}
        onConfirm={confirmLost}
        onCancel={() => setPendingLost(null)}
      />
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Deal?"
        description="This deal and its activities and tasks will be permanently removed."
        confirmLabel="Yes, Delete Deal"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

export default function DealsPage() {
  return (
    <Suspense fallback={<div className="h-96 rounded-2xl bg-muted animate-pulse" />}>
      <DealsPageInner />
    </Suspense>
  );
}
