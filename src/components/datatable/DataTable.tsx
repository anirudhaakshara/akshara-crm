"use client";

import React from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
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
}: DataTableProps<T>) {
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="space-y-4">
      {/* Search and Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {onSearchChange && (
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
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

      {/* Table Container */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 uppercase tracking-wider text-[11px] font-semibold text-muted-foreground">
              <tr>
                {columns.map((col) => {
                  const isSorted = sortField === col.id;
                  return (
                    <th
                      key={col.id}
                      className={`p-3.5 ${col.className || ""}`}
                      onClick={() => col.sortable && onSortChange && onSortChange(col.id)}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 hover:text-foreground transition-colors group"
                        >
                          <span>{col.header}</span>
                          {isSorted ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="h-3 w-3 text-primary" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                // Loading Skeletons
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    {columns.map((col) => (
                      <td key={`skeleton-cell-${col.id}`} className="p-3.5">
                        <div className="h-4 bg-muted rounded-md w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={columns.length} className="p-8 text-center text-muted-foreground">
                    <p className="font-medium">{emptyMessage}</p>
                  </td>
                </tr>
              ) : (
                // Data Rows
                data.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-muted/30 transition-colors group ${rowClassName?.(item) || ""}`}
                  >
                    {columns.map((col) => (
                      <td key={col.id} className={`p-3.5 align-middle ${col.className || ""}`}>
                        {col.cell
                          ? col.cell(item)
                          : col.accessorKey
                          ? String(item[col.accessorKey] ?? "-")
                          : "-"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground bg-card">
          <div>
            Showing <span className="font-semibold text-foreground">{startItem}</span> to{" "}
            <span className="font-semibold text-foreground">{endItem}</span> of{" "}
            <span className="font-semibold text-foreground">{totalItems}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
            <span className="px-2 font-medium text-foreground">
              {page} / {Math.max(1, totalPages)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(page + 1)}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
