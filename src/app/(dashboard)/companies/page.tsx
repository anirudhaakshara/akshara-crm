"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Building2, Plus, Edit2, Trash2, Globe, Phone, ExternalLink } from "lucide-react";
import { DataTable, ColumnDef } from "@/components/datatable/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyDialog } from "@/features/companies/components/CompanyDialog";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/components/feedback/Toast";
import { formatDate } from "@/lib/formatters";

interface CompanyRecord {
  id: string;
  name: string;
  industry: string;
  city: string;
  website: string | null;
  phone: string | null;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  _count: { contacts: number; deals: number };
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function CompaniesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const toast = useToast();

  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyRecord | null>(null);

  // Delete states
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch users for assignment if admin
  useEffect(() => {
    if (isAdmin) {
      fetch("/api/users")
        .then((res) => res.json())
        .then((res) => {
          if (res.data?.users) setUsers(res.data.users);
          else if (res.users) setUsers(res.users);
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        sortBy: sortField,
        sortOrder,
      });
      if (searchTerm) params.set("q", searchTerm);
      if (industryFilter) params.set("industry", industryFilter);

      const res = await fetch(`/api/companies?${params.toString()}`);
      const json = await res.json();

      if (res.ok) {
        setCompanies(json.data || []);
        if (json.meta) {
          setTotalPages(json.meta.totalPages);
          setTotalItems(json.meta.totalItems);
        }
      } else {
        toast.error(json.error?.message || "Failed to load companies");
      }
    } catch {
      toast.error("Network error loading companies");
    } finally {
      setLoading(false);
    }
  }, [page, sortField, sortOrder, searchTerm, industryFilter, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompanies();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCompanies]);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/companies/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        toast.success("Company deleted successfully");
        setDeleteId(null);
        fetchCompanies();
      } else {
        toast.error(json.error?.message || "Failed to delete company");
      }
    } catch {
      toast.error("Network error deleting company");
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
        <div className="flex flex-col">
          <Link
            href={`/companies/${row.id}`}
            className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
          >
            <span>{row.name}</span>
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
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
        <Badge variant="secondary" className="font-medium">
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
            <a
              href={row.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-primary transition-colors truncate max-w-[150px]"
            >
              <Globe className="h-3 w-3" />
              <span>{row.website.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
          {row.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span>{row.phone}</span>
            </span>
          )}
          {!row.website && !row.phone && <span>-</span>}
        </div>
      ),
    },
    {
      id: "counts",
      header: "Related",
      cell: (row) => (
        <div className="flex items-center gap-2 text-[11px]">
          <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">
            {row._count.contacts} contacts
          </span>
          <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">
            {row._count.deals} deals
          </span>
        </div>
      ),
    },
    {
      id: "owner",
      header: "Account Owner",
      cell: (row) => (
        <span className="text-xs font-medium text-foreground">{row.owner?.name || "-"}</span>
      ),
    },
    {
      id: "createdAt",
      header: "Created",
      sortable: true,
      cell: (row) => (
        <span className="text-muted-foreground text-[11px]">{formatDate(row.createdAt)}</span>
      ),
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
            onClick={() => {
              setEditingCompany(row);
              setDialogOpen(true);
            }}
            title="Edit company"
          >
            <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(row.id)}
            title="Delete company"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
            <Building2 className="h-6 w-6 text-primary" />
            <span>Companies</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage target accounts, organization profiles, and linked business contacts.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingCompany(null);
            setDialogOpen(true);
          }}
          className="gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Company</span>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={companies}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
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
        filterControls={
          <select
            value={industryFilter}
            onChange={(e) => {
              setIndustryFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Industries</option>
            <option value="IT Services">IT Services</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="FinTech">FinTech</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Logistics">Logistics</option>
            <option value="Retail">Retail</option>
            <option value="E-Commerce">E-Commerce</option>
            <option value="Infrastructure">Infrastructure</option>
            <option value="EdTech">EdTech</option>
            <option value="Telecommunications">Telecommunications</option>
          </select>
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
        open={!!deleteId}
        title="Delete Company?"
        description="Are you sure you want to delete this company? Related contacts and deals will retain their data with company unlinked."
        confirmLabel="Yes, Delete Company"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
