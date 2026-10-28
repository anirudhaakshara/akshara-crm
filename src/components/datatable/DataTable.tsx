"use client";

import React from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Inbox } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  /** When set, the table body is replaced by an error message with a retry button. */
  error?: string | null;
  onRetry?: () => void;
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  searchTerm?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (field: string) => void;
  filterControls?: React.ReactNode;
  actionButton?: React.ReactNode;
  emptyMessage?: string;
  rowClassName?: (item: T) => string | undefined;
  /** Accessible name for the table. */
  caption?: string;
}

/**
 * Reusable server-driven table: search, filters, sortable headers (announced via aria-sort),
 * skeleton loading, empty and error states, and pagination.
 */
export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  error,
  onRetry,
  page,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  sortField,
  sortOrder,
  onSortChange,
  filterControls,
  actionButton,
  emptyMessage = "No records found.",
  rowClassName,
  caption,
}: DataTableProps<T>) {
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
          {onSearchChange && (
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                aria-label={searchPlaceholder.replace(/\.+$/, "")}
                placeholder={searchPlaceholder}
                value={searchTerm || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          {filterControls}
        </div>

        {actionButton && <div className="flex items-center gap-2">{actionButton}</div>}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-busy={loading}>
              {caption && <caption className="sr-only">{caption}</caption>}
              <thead className="border-b border-border bg-muted/40 uppercase tracking-wider text-[11px] font-semibold text-muted-foreground">
                <tr>
                  {columns.map((col) => {
                    const isSorted = sortField === col.id;
                    return (
                      <th
                        key={col.id}
                        scope="col"
                        className={`p-3.5 whitespace-nowrap ${col.className || ""}`}
                        aria-sort={col.sortable ? (isSorted ? (sortOrder === "asc" ? "ascending" : "descending") : "none") : undefined}
                      >
                        {col.sortable && onSortChange ? (
                          <button
                            type="button"
                            onClick={() => onSortChange(col.id)}
                            className="inline-flex items-center gap-1.5 uppercase hover:text-foreground transition-colors group"
                          >
                            <span>{col.header}</span>
                            {isSorted ? (
                              sortOrder === "asc" ? (
                                <ArrowUp className="h-3 w-3 text-primary" aria-hidden />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-primary" aria-hidden />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100" aria-hidden />
                            )}
                          </button>
                        ) : col.header ? (
                          col.header
                        ) : (
                          <span className="sr-only">{col.id}</span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: Math.min(pageSize, 5) }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} className="animate-pulse">
                      {columns.map((col) => (
                        <td key={`skeleton-cell-${col.id}`} className="p-3.5">
                          <div className="h-4 bg-muted rounded-md w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="p-10 text-center text-muted-foreground">
                      <Inbox className="mx-auto mb-2 h-6 w-6 opacity-50" aria-hidden />
                      <p className="font-medium">{emptyMessage}</p>
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.id} className={`hover:bg-muted/30 transition-colors group ${rowClassName?.(item) || ""}`}>
                      {columns.map((col) => (
                        <td key={col.id} className={`p-3.5 align-middle ${col.className || ""}`}>
                          {col.cell ? col.cell(item) : col.accessorKey ? String(item[col.accessorKey] ?? "-") : "-"}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <nav
            aria-label="Pagination"
            className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground bg-card"
          >
            <p aria-live="polite">
              Showing <span className="font-semibold text-foreground">{startItem}</span> to{" "}
              <span className="font-semibold text-foreground">{endItem}</span> of{" "}
              <span className="font-semibold text-foreground">{totalItems}</span>
            </p>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => onPageChange(page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5 sm:mr-1" aria-hidden />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <span className="px-2 font-medium text-foreground">
                Page {page} of {Math.max(1, totalPages)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => onPageChange(page + 1)}
                aria-label="Next page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-3.5 w-3.5 sm:ml-1" aria-hidden />
              </Button>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
