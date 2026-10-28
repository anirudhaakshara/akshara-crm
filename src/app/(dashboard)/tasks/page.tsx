"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AlertTriangle, CheckSquare, Edit2, Plus, Trash2 } from "lucide-react";
import { DataTable, ColumnDef } from "@/components/datatable/DataTable";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/components/feedback/Toast";
import { apiFetch, errorMessage, Paginated } from "@/lib/api-client";
import { formatDate, isOverdue } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useContactOptions, useUserOptions } from "@/hooks/useOptions";
import { TASK_PRIORITIES, type TaskStatusValue } from "@/features/tasks/schemas/task";
import { PriorityBadge } from "@/features/tasks/components/PriorityBadge";
import { TaskDialog } from "@/features/tasks/components/TaskDialog";
import { TaskToggle } from "@/features/tasks/components/TaskToggle";
import type { TaskRecord } from "@/features/tasks/types";

const PAGE_SIZE = 10;

interface TaskListResponse extends Paginated<TaskRecord> {
  meta: Paginated<TaskRecord>["meta"] & { counts: { OPEN: number; DONE: number; overdue: number } };
}

export default function TasksPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const toast = useToast();
  const users = useUserOptions(isAdmin);
  const contacts = useContactOptions();

  const [tab, setTab] = useState<TaskStatusValue>("OPEN");
  const [rows, setRows] = useState<TaskRecord[]>([]);
  const [counts, setCounts] = useState({ OPEN: 0, DONE: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortField, setSortField] = useState("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        status: tab,
        sortBy: sortField,
        sortOrder,
      });
      if (search) params.set("q", search);
      if (priority) params.set("priority", priority);
      if (assigneeId) params.set("assigneeId", assigneeId);
      if (overdueOnly && tab === "OPEN") params.set("overdue", "true");
      const res = await apiFetch<TaskListResponse>(`/api/tasks?${params}`);
      setRows(res.data);
      setCounts(res.meta.counts);
      setTotalPages(res.meta.totalPages);
      setTotalItems(res.meta.totalItems);
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err, "Failed to load tasks"));
    } finally {
      setLoading(false);
    }
  }, [page, tab, sortField, sortOrder, search, priority, assigneeId, overdueOnly]);

  useEffect(() => {
    const t = setTimeout(fetchTasks, 250);
    return () => clearTimeout(t);
  }, [fetchTasks]);

  function handleSort(field: string) {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortOrder(field === "priority" ? "desc" : "asc");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/tasks/${deleteId}`, { method: "DELETE" });
      toast.success("Task deleted");
      setDeleteId(null);
      fetchTasks();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete task"));
    } finally {
      setDeleting(false);
    }
  }

  function onStatusChanged(task: TaskRecord, status: TaskStatusValue) {
    // Reflect immediately, then refetch so the row moves to the other tab and counts update.
    setRows((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    if (status !== task.status) setTimeout(fetchTasks, 400);
  }

  const columns: ColumnDef<TaskRecord>[] = [
    {
      id: "done",
      header: "",
      className: "w-8",
      cell: (row) => <TaskToggle taskId={row.id} status={row.status} onChanged={(s) => onStatusChanged(row, s)} />,
    },
    {
      id: "title",
      header: "Task",
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col min-w-[180px]">
          <button
            type="button"
            className={cn(
              "text-left font-semibold text-foreground hover:text-primary transition-colors",
              row.status === "DONE" && "line-through text-muted-foreground"
            )}
            onClick={() => {
              setEditing(row);
              setDialogOpen(true);
            }}
          >
            {row.title}
          </button>
          {row.description && <span className="text-[11px] text-muted-foreground line-clamp-1">{row.description}</span>}
        </div>
      ),
    },
    {
      id: "related",
      header: "Related To",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 text-[11px]">
          {row.deal && (
            <Link href={`/deals/${row.deal.id}`} className="text-primary hover:underline truncate max-w-[180px]">
              {row.deal.title}
            </Link>
          )}
          {row.contact && (
            <Link href={`/contacts/${row.contact.id}`} className="text-muted-foreground hover:text-primary">
              {row.contact.firstName} {row.contact.lastName}
            </Link>
          )}
          {!row.deal && !row.contact && <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      id: "dueDate",
      header: "Due",
      sortable: true,
      cell: (row) => {
        const overdue = isOverdue(row.dueDate, row.status);
        return (
          <span className={cn("relative inline-flex items-center gap-1 whitespace-nowrap text-[11px]", overdue ? "font-semibold text-red-700 dark:text-red-400" : "text-muted-foreground")}>
            {overdue && <AlertTriangle className="h-3 w-3" />}
            {formatDate(row.dueDate)}
            {overdue && <span className="sr-only">(overdue)</span>}
          </span>
        );
      },
    },
    { id: "priority", header: "Priority", sortable: true, cell: (row) => <PriorityBadge priority={row.priority} /> },
    ...(isAdmin
      ? [{ id: "assignee", header: "Assignee", cell: (row: TaskRecord) => <span className="text-xs">{row.assignee?.name ?? "—"}</span> }]
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
            <Trash2 className="h-3.5 w-3.5 text-red-700 dark:text-red-400" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <CheckSquare className="h-6 w-6 text-primary" />
            Tasks
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {counts.overdue > 0 ? (
              <span className="text-red-700 dark:text-red-400 font-semibold">{counts.overdue} overdue</span>
            ) : (
              "Nothing overdue"
            )}{" "}
            · {counts.OPEN} open follow-ups
          </p>
        </div>
        <Button
          className="gap-1.5 shadow-sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      <div className="flex items-center gap-1 border-b border-border" role="tablist" aria-label="Task status">
        {(["OPEN", "DONE"] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={tab === s}
            onClick={() => {
              setTab(s);
              setPage(1);
            }}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-xs font-semibold transition-colors",
              tab === s ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {s === "OPEN" ? "Open" : "Done"}
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-foreground">{counts[s]}</span>
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        error={loadError}
        onRetry={fetchTasks}
        caption="Tasks"
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
        searchPlaceholder="Search tasks..."
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={handleSort}
        rowClassName={(row) => (isOverdue(row.dueDate, row.status) ? "bg-destructive/5" : undefined)}
        emptyMessage={tab === "OPEN" ? "No open tasks — you're all caught up." : "No completed tasks yet."}
        filterControls={
          <>
            <Select
              aria-label="Filter by priority"
              className="sm:w-36"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All priorities</option>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
            {isAdmin && (
              <Select
                aria-label="Filter by assignee"
                className="sm:w-40"
                value={assigneeId}
                onChange={(e) => {
                  setAssigneeId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All assignees</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            )}
            {tab === "OPEN" && (
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
                  checked={overdueOnly}
                  onChange={(e) => {
                    setOverdueOnly(e.target.checked);
                    setPage(1);
                  }}
                />
                Overdue only
              </label>
            )}
          </>
        }
      />

      <TaskDialog
        open={dialogOpen}
        initialData={editing}
        contacts={contacts}
        users={users}
        isAdmin={isAdmin}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSaved={fetchTasks}
      />
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Task?"
        description="This follow-up task will be permanently removed."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
