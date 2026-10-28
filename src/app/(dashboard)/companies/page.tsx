"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Building2, Plus, Edit2, Trash2, Globe, Phone } from "lucide-react";
import { DataTable, ColumnDef } from "@/components/datatable/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/components/feedback/Toast";
import { apiFetch, errorMessage, Paginated } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import { useUserOptions } from "@/hooks/useOptions";
import { CompanyDialog, CompanyFormData } from "@/features/companies/components/CompanyDialog";
import { INDUSTRIES } from "@/features/companies/constants";

interface CompanyRecord {
  id: string;
  name: string;
  industry: string;
  city: string;
  website: string | null;
  phone: string | null;
  ownerId: string;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  _count: { contacts: number; deals: number };
}

const PAGE_SIZE = 10;

export default function CompaniesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const toast = useToast();
  const users = useUserOptions(isAdmin);

  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyFormData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sortBy: sortField, sortOrder });
      if (searchTerm) params.set("q", searchTerm);
      if (industryFilter) params.set("industry", industryFilter);
      if (ownerId) params.set("ownerId", ownerId);
      const res = await apiFetch<Paginated<CompanyRecord>>(`/api/companies?${params}`);
      setCompanies(res.data);
      setTotalPages(res.meta.totalPages);
      setTotalItems(res.meta.totalItems);
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err, "Failed to load companies"));
    } finally {
      setLoading(false);
    }
  }, [page, sortField, sortOrder, searchTerm, industryFilter, ownerId]);

  useEffect(() => {
    const timer = setTimeout(fetchCompanies, 250);
    return () => clearTimeout(timer);
  }, [fetchCompanies]);

  function handleSort(field: string) {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/companies/${deleteTarget.id}`, { method: "DELETE" });
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      fetchCompanies();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete company"));
    } finally {
      setDeleting(false);
    }
  }

  const columns: ColumnDef<CompanyRecord>[] = [
    {
      id: "name",
      header: "Company",
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col min-w-[160px]">
          <Link href={`/companies/${row.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
            {row.name}
          </Link>
          <span className="text-[11px] text-muted-foreground">{row.city}</span>
        </div>
      ),
    },
    {
      id: "industry",
      header: "Industry",
      sortable: true,
      cell: (row) => (
        <Badge variant="secondary" className="font-medium whitespace-nowrap">
          {row.industry}
        </Badge>
      ),
    },
    {
      id: "contactInfo",
      header: "Contact Info",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
          {row.website && (
            <a href={row.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary transition-colors truncate max-w-[180px]">
              <Globe className="h-3 w-3 shrink-0" aria-hidden />
              <span>{row.website.replace(/^https?:\/\//, "")}</span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
          {row.phone && (
            <a href={`tel:${row.phone}`} className="inline-flex items-center gap-1 hover:text-primary whitespace-nowrap">
              <Phone className="h-3 w-3 shrink-0" aria-hidden />
              {row.phone}
            </a>
          )}
          {!row.website && !row.phone && <span>—</span>}
        </div>
      ),
    },
    {
      id: "counts",
      header: "Related",
      cell: (row) => (
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          {row._count.contacts} contacts · {row._count.deals} deals
        </span>
      ),
    },
    ...(isAdmin
      ? [{ id: "owner", header: "Owner", cell: (row: CompanyRecord) => <span className="text-xs whitespace-nowrap">{row.owner?.name ?? "—"}</span> }]
      : []),
    {
      id: "createdAt",
      header: "Created",
      sortable: true,
      cell: (row) => <span className="text-muted-foreground text-[11px] whitespace-nowrap">{formatDate(row.createdAt)}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      className: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${row.name}`}
            onClick={() => {
              setEditingCompany(row);
              setDialogOpen(true);
            }}
          >
            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${row.name}`} onClick={() => setDeleteTarget(row)}>
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
            <Building2 className="h-6 w-6 text-primary" aria-hidden />
            Companies
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Accounts you sell to, with their contacts and deals.</p>
        </div>
        <Button
          onClick={() => {
            setEditingCompany(null);
            setDialogOpen(true);
          }}
          className="gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Company
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={companies}
        loading={loading}
        error={loadError}
        onRetry={fetchCompanies}
        caption="Companies"
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setPage(1);
        }}
        searchPlaceholder="Search company, city, industry..."
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={handleSort}
        emptyMessage={searchTerm || industryFilter || ownerId ? "No companies match these filters." : "No companies yet — add your first account."}
        filterControls={
          <>
            <Select
              aria-label="Filter by industry"
              className="sm:w-44"
              value={industryFilter}
              onChange={(e) => {
                setIndustryFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All industries</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </Select>
            {isAdmin && (
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
            )}
          </>
        }
      />

      <CompanyDialog
        open={dialogOpen}
        initialData={editingCompany}
        users={users}
        isAdmin={isAdmin}
        onClose={() => {
          setDialogOpen(false);
          setEditingCompany(null);
        }}
        onSaved={fetchCompanies}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.name ?? "company"}?`}
        description="Its contacts and deals are kept but will no longer be linked to a company. This cannot be undone."
        confirmLabel="Delete company"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
