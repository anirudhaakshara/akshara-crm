"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Users, Plus, Edit2, Trash2, Mail, Phone } from "lucide-react";
import { DataTable, ColumnDef } from "@/components/datatable/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/components/feedback/Toast";
import { apiFetch, errorMessage, Paginated } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import { useCompanyOptions, useUserOptions } from "@/hooks/useOptions";
import { ContactDialog, ContactFormData } from "@/features/contacts/components/ContactDialog";
import {
  CONTACT_SOURCES,
  CONTACT_STATUSES,
  SOURCE_LABELS,
  STATUS_LABELS,
  STATUS_VARIANTS,
  type ContactSourceValue,
  type ContactStatusValue,
} from "@/features/contacts/constants";

interface ContactRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  companyId: string | null;
  ownerId: string;
  status: ContactStatusValue;
  source: ContactSourceValue;
  createdAt: string;
  company: { id: string; name: string; city: string } | null;
  owner: { id: string; name: string } | null;
  _count: { deals: number; activities: number; tasks: number };
}

const PAGE_SIZE = 10;

export default function ContactsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const toast = useToast();
  const users = useUserOptions(isAdmin);
  const companies = useCompanyOptions();

  const [rows, setRows] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContactFormData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sortBy: sortField,
        sortOrder,
      });
      if (search) params.set("q", search);
      if (status) params.set("status", status);
      if (source) params.set("source", source);
      if (ownerId) params.set("ownerId", ownerId);
      const res = await apiFetch<Paginated<ContactRecord>>(`/api/contacts?${params}`);
      setRows(res.data);
      setTotalPages(res.meta.totalPages);
      setTotalItems(res.meta.totalItems);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to load contacts"));
    } finally {
      setLoading(false);
    }
  }, [page, sortField, sortOrder, search, status, source, ownerId, toast]);

  useEffect(() => {
    const t = setTimeout(fetchContacts, 250);
    return () => clearTimeout(t);
  }, [fetchContacts]);

  function handleSort(field: string) {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/contacts/${deleteId}`, { method: "DELETE" });
      toast.success("Contact deleted");
      setDeleteId(null);
      fetchContacts();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete contact"));
    } finally {
      setDeleting(false);
    }
  }

  const columns: ColumnDef<ContactRecord>[] = [
    {
      id: "firstName",
      header: "Name",
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col min-w-[140px]">
          <Link href={`/contacts/${row.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
            {row.firstName} {row.lastName}
          </Link>
          <span className="text-[11px] text-muted-foreground">{row.jobTitle || "—"}</span>
        </div>
      ),
    },
    {
      id: "company",
      header: "Company",
      cell: (row) =>
        row.company ? (
          <Link href={`/companies/${row.company.id}`} className="text-xs hover:text-primary transition-colors">
            {row.company.name}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "email",
      header: "Contact Info",
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
          <a href={`mailto:${row.email}`} className="inline-flex items-center gap-1 hover:text-primary truncate max-w-[200px]">
            <Mail className="h-3 w-3 shrink-0" />
            {row.email}
          </a>
          {row.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3 shrink-0" />
              {row.phone}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      cell: (row) => <Badge variant={STATUS_VARIANTS[row.status]}>{STATUS_LABELS[row.status]}</Badge>,
    },
    {
      id: "source",
      header: "Source",
      sortable: true,
      cell: (row) => <span className="text-xs text-muted-foreground">{SOURCE_LABELS[row.source]}</span>,
    },
    ...(isAdmin
      ? [
          {
            id: "owner",
            header: "Owner",
            cell: (row: ContactRecord) => <span className="text-xs">{row.owner?.name ?? "—"}</span>,
          },
        ]
      : []),
    {
      id: "createdAt",
      header: "Created",
      sortable: true,
      cell: (row) => <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(row.createdAt)}</span>,
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
            aria-label={`Edit ${row.firstName} ${row.lastName}`}
            onClick={() => {
              setEditing({
                id: row.id,
                firstName: row.firstName,
                lastName: row.lastName,
                email: row.email,
                phone: row.phone,
                jobTitle: row.jobTitle,
                companyId: row.companyId,
                status: row.status,
                source: row.source,
              });
              setDialogOpen(true);
            }}
          >
            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${row.firstName} ${row.lastName}`} onClick={() => setDeleteId(row.id)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="h-6 w-6 text-primary" />
            <span>Contacts</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Leads, prospects and customers across your accounts.</p>
        </div>
        <Button
          className="gap-1.5 shadow-sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New Contact
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        searchTerm={search}
        onSearchChange={resetPage(setSearch)}
        searchPlaceholder="Search name, email, phone, title..."
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={handleSort}
        emptyMessage={search || status || source || ownerId ? "No contacts match these filters." : "No contacts yet — add your first one."}
        filterControls={
          <>
            <Select aria-label="Filter by status" className="sm:w-36" value={status} onChange={(e) => resetPage(setStatus)(e.target.value)}>
              <option value="">All statuses</option>
              {CONTACT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
            <Select aria-label="Filter by source" className="sm:w-36" value={source} onChange={(e) => resetPage(setSource)(e.target.value)}>
              <option value="">All sources</option>
              {CONTACT_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </option>
              ))}
            </Select>
            {isAdmin && (
              <Select aria-label="Filter by owner" className="sm:w-40" value={ownerId} onChange={(e) => resetPage(setOwnerId)(e.target.value)}>
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

      <ContactDialog
        open={dialogOpen}
        initialData={editing}
        companies={companies}
        users={users}
        isAdmin={isAdmin}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSaved={fetchContacts}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Contact?"
        description="This also deletes the contact's deals, activities and tasks. This cannot be undone."
        confirmLabel="Yes, Delete Contact"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
