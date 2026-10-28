"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  Users,
  Kanban,
  Globe,
  Phone,
  MapPin,
  Calendar,
  IndianRupee,
  ShieldCheck,
  Edit2,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompanyDialog } from "@/features/companies/components/CompanyDialog";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/components/feedback/Toast";
import { formatINR, formatDate } from "@/lib/formatters";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  status: string;
  source: string;
}

interface Deal {
  id: string;
  title: string;
  value: number | string;
  stage: string;
  expectedCloseDate: string;
  contact: { id: string; firstName: string; lastName: string };
}

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
  updatedAt: string;
  contacts: Contact[];
  deals: Deal[];
  totalPipelineValue: number;
}

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const companyId = params.id as string;

  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchCompany = useCallback(async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}`);
      const json = await res.json();
      if (res.ok) {
        setCompany(json);
      } else {
        toast.error(json.error?.message || "Company not found");
        router.push("/companies");
      }
    } catch {
      toast.error("Failed to fetch company details");
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
      const res = await fetch(`/api/companies/${companyId}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        toast.success("Company deleted successfully");
        router.push("/companies");
      } else {
        toast.error(json.error?.message || "Failed to delete company");
      }
    } catch {
      toast.error("Error deleting company");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-40 rounded-2xl bg-muted" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-64 rounded-xl bg-muted" />
          <div className="h-64 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/companies"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Companies</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit Company</span>
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {/* Main Profile Header */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{company.name}</h1>
                <Badge variant="secondary">{company.industry}</Badge>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{company.city}</span>
                </span>
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>{company.website.replace(/^https?:\/\//, "")}</span>
                  </a>
                )}
                {company.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{company.phone}</span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Created {formatDate(company.createdAt)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Account Owner & Pipeline Value Pill */}
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-border">
            <div className="text-left md:text-right">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Total Pipeline Value
              </span>
              <span className="text-xl font-bold text-foreground">
                {formatINR(company.totalPipelineValue)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Owner: {company.owner?.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Contacts & Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Associated Contacts */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Contacts ({company.contacts.length})</h2>
            </div>
            <Link href="/contacts" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>

          {company.contacts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No contacts associated with this company.</p>
          ) : (
            <div className="divide-y divide-border">
              {company.contacts.map((contact) => (
                <div key={contact.id} className="py-3 flex items-center justify-between group">
                  <div>
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="text-xs font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <span>
                        {contact.firstName} {contact.lastName}
                      </span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    <p className="text-[11px] text-muted-foreground">{contact.jobTitle || "No title"} &bull; {contact.email}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {contact.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Associated Deals */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Kanban className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Deals & Opportunities ({company.deals.length})</h2>
            </div>
            <span className="text-xs font-semibold text-foreground">
              Total: {formatINR(company.totalPipelineValue)}
            </span>
          </div>

          {company.deals.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No deals active for this company.</p>
          ) : (
            <div className="divide-y divide-border">
              {company.deals.map((deal) => (
                <div key={deal.id} className="py-3 flex items-center justify-between group">
                  <div className="space-y-0.5">
                    <Link
                      href={`/deals/${deal.id}`}
                      className="text-xs font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <span>{deal.title}</span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    <p className="text-[11px] text-muted-foreground">
                      Contact: {deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : "None"} &bull; Close: {formatDate(deal.expectedCloseDate)}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-foreground block">{formatINR(deal.value)}</span>
                    <Badge
                      variant={
                        deal.stage === "WON"
                          ? "success"
                          : deal.stage === "LOST"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {deal.stage}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CompanyDialog
        open={editOpen}
        initialData={company}
        onClose={() => setEditOpen(false)}
        onSaved={fetchCompany}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Company?"
        description="Are you sure you want to delete this company? Contacts and deals will remain intact."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
