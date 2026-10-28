"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Building2, ChevronLeft, Users, Kanban, Globe, Phone, MapPin, Calendar, ShieldCheck, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/components/feedback/Toast";
import { apiFetch, ApiClientError, errorMessage } from "@/lib/api-client";
import { formatINR, formatDate } from "@/lib/formatters";
import { useUserOptions } from "@/hooks/useOptions";
import { CompanyDialog } from "@/features/companies/components/CompanyDialog";
import { STATUS_LABELS, STATUS_VARIANTS, type ContactStatusValue } from "@/features/contacts/constants";
import { StageBadge } from "@/features/deals/components/StageBadge";
import type { DealStageValue } from "@/features/deals/schemas/deal";
import { WinScoreBadge } from "@/features/ml/components/WinScoreBadge";

interface CompanyDetails {
  id: string;
  name: string;
  industry: string;
  city: string;
  website: string | null;
  phone: string | null;
  ownerId: string;
  owner: { id: string; name: string; email: string };
  createdAt: string;
  contacts: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string | null;
    status: ContactStatusValue;
  }[];
  deals: {
    id: string;
    title: string;
    value: number | string;
    stage: DealStageValue;
    expectedCloseDate: string;
    winProbability: number | null;
    contact: { id: string; firstName: string; lastName: string } | null;
  }[];
  totalPipelineValue: number;
  openPipelineValue: number;
}

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const users = useUserOptions(isAdmin);
  const companyId = params.id as string;

  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchCompany = useCallback(async () => {
    try {
      setCompany(await apiFetch<CompanyDetails>(`/api/companies/${companyId}`));
      setLoadError(null);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 404 || err.status === 403)) {
        toast.error(err.message);
        router.push("/companies");
        return;
      }
      setLoadError(errorMessage(err, "Failed to load company"));
    } finally {
      setLoading(false);
    }
  }, [companyId, router, toast]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/companies/${companyId}`, { method: "DELETE" });
      toast.success("Company deleted");
      router.push("/companies");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete company"));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse" aria-busy="true">
        <div className="h-5 w-32 bg-muted rounded" />
        <div className="h-36 rounded-2xl bg-muted" />
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-xl bg-muted" />
          <div className="h-64 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (loadError) return <ErrorState message={loadError} onRetry={fetchCompany} />;
  if (!company) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link href="/companies" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Back to Companies
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20" aria-hidden>
              <Building2 className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{company.name}</h1>
                <Badge variant="secondary">{company.industry}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {company.city}
                </span>
                {company.website && (
                  <a href={company.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline break-all">
                    <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {company.website.replace(/^https?:\/\//, "")}
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
                {company.phone && (
                  <a href={`tel:${company.phone}`} className="flex items-center gap-1 hover:text-primary">
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    {company.phone}
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                  Added {formatDate(company.createdAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t md:border-t-0 pt-3 md:pt-0 border-border space-y-2 md:space-y-1">
          <dl className="grid grid-cols-2 md:flex md:flex-col md:items-end gap-3 md:gap-1">
            <div className="md:text-right">
              <dt className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Open pipeline</dt>
              <dd className="text-xl font-bold text-foreground tabular-nums">{formatINR(company.openPipelineValue)}</dd>
            </div>
            <div className="md:text-right">
              <dt className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">All deals</dt>
              <dd className="text-sm font-semibold text-foreground tabular-nums">{formatINR(company.totalPipelineValue)}</dd>
            </div>
          </dl>
            <p className="flex items-center md:justify-end gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
              Owner: {company.owner?.name}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4" aria-labelledby="company-contacts">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 id="company-contacts" className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Users className="h-4 w-4 text-primary" aria-hidden />
              Contacts ({company.contacts.length})
            </h2>
          </div>
          {company.contacts.length === 0 ? (
            <EmptyState icon={Users} title="No contacts yet" description="Add a contact and pick this company." />
          ) : (
            <ul className="divide-y divide-border">
              {company.contacts.map((contact) => (
                <li key={contact.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/contacts/${contact.id}`} className="text-xs font-semibold text-foreground hover:text-primary transition-colors">
                      {contact.firstName} {contact.lastName}
                    </Link>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {contact.jobTitle || "No title"} · {contact.email}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANTS[contact.status]}>{STATUS_LABELS[contact.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4" aria-labelledby="company-deals">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
            <h2 id="company-deals" className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Kanban className="h-4 w-4 text-primary" aria-hidden />
              Deals ({company.deals.length})
            </h2>
            <span className="text-xs font-semibold text-foreground tabular-nums">Total {formatINR(company.totalPipelineValue)}</span>
          </div>
          {company.deals.length === 0 ? (
            <EmptyState icon={Kanban} title="No deals yet" description="Create a deal from one of this company's contacts." />
          ) : (
            <ul className="divide-y divide-border">
              {company.deals.map((deal) => (
                <li key={deal.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <Link href={`/deals/${deal.id}`} className="block truncate text-xs font-semibold text-foreground hover:text-primary transition-colors">
                      {deal.title}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">
                      {deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : "No contact"} · Close {formatDate(deal.expectedCloseDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs font-bold text-foreground tabular-nums">{formatINR(deal.value)}</span>
                    <div className="flex items-center gap-1">
                      <WinScoreBadge stage={deal.stage} winProbability={deal.winProbability} />
                      <StageBadge stage={deal.stage} className="text-[10px]" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <CompanyDialog open={editOpen} initialData={company} users={users} isAdmin={isAdmin} onClose={() => setEditOpen(false)} onSaved={fetchCompany} />

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete ${company.name}?`}
        description="Its contacts and deals are kept but will no longer be linked to a company. This cannot be undone."
        confirmLabel="Delete company"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
