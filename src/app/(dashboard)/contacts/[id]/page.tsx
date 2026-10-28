"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Activity as ActivityIcon,
  Briefcase,
  Building2,
  Calendar,
  CheckSquare,
  ChevronLeft,
  Edit2,
  Kanban,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/components/feedback/Toast";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatDate, formatINR } from "@/lib/formatters";
import { useCompanyOptions, useContactOptions, useUserOptions } from "@/hooks/useOptions";
import { ContactDialog } from "@/features/contacts/components/ContactDialog";
import {
  SOURCE_LABELS,
  STATUS_LABELS,
  STATUS_VARIANTS,
  type ContactSourceValue,
  type ContactStatusValue,
} from "@/features/contacts/constants";
import { ActivityModal } from "@/features/activities/components/ActivityModal";
import { ActivityTimeline, ActivityItem } from "@/features/activities/components/ActivityTimeline";
import { DealDialog } from "@/features/deals/components/DealDialog";
import { StageBadge } from "@/features/deals/components/StageBadge";
import type { DealStageValue } from "@/features/deals/schemas/deal";
import { TaskDialog } from "@/features/tasks/components/TaskDialog";
import { TaskList } from "@/features/tasks/components/TaskList";
import type { TaskRecord } from "@/features/tasks/types";

interface ContactDetail {
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
  company: { id: string; name: string; city: string; industry: string } | null;
  owner: { id: string; name: string; email: string } | null;
  deals: {
    id: string;
    title: string;
    value: string | number;
    stage: DealStageValue;
    expectedCloseDate: string;
  }[];
  activities: ActivityItem[];
  tasks: TaskRecord[];
}

function SectionCard({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const contactId = params.id as string;

  const users = useUserOptions(isAdmin);
  const companies = useCompanyOptions();
  const contactOptions = useContactOptions();

  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);

  const fetchContact = useCallback(async () => {
    try {
      setContact(await apiFetch<ContactDetail>(`/api/contacts/${contactId}`));
    } catch (err) {
      toast.error(errorMessage(err, "Contact not found"));
      router.push("/contacts");
    } finally {
      setLoading(false);
    }
  }, [contactId, router, toast]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/contacts/${contactId}`, { method: "DELETE" });
      toast.success("Contact deleted");
      router.push("/contacts");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete contact"));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 w-32 bg-muted rounded" />
        <div className="h-36 rounded-2xl bg-muted" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="h-80 rounded-xl bg-muted lg:col-span-2" />
          <div className="h-80 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!contact) return null;

  const fullName = `${contact.firstName} ${contact.lastName}`;
  const openDeals = contact.deals.filter((d) => d.stage !== "WON" && d.stage !== "LOST");
  const openValue = openDeals.reduce((s, d) => s + Number(d.value), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link href="/contacts" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to Contacts
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 text-lg font-bold">
              {contact.firstName[0]}
              {contact.lastName[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{fullName}</h1>
                <Badge variant={STATUS_VARIANTS[contact.status]}>{STATUS_LABELS[contact.status]}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                {contact.jobTitle && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    {contact.jobTitle}
                  </span>
                )}
                {contact.company && (
                  <Link href={`/companies/${contact.company.id}`} className="flex items-center gap-1 text-primary hover:underline">
                    <Building2 className="h-3.5 w-3.5" />
                    {contact.company.name}
                  </Link>
                )}
                <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-primary break-all">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {contact.email}
                </a>
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-primary">
                    <Phone className="h-3.5 w-3.5" />
                    {contact.phone}
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Added {formatDate(contact.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-1 border-t md:border-t-0 pt-3 md:pt-0 border-border">
            <div className="text-left md:text-right">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Open pipeline</span>
              <span className="text-xl font-bold text-foreground">{formatINR(openValue)}</span>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Owner: {contact.owner?.name ?? "—"}
              </span>
              <span>Source: {SOURCE_LABELS[contact.source]}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard
            icon={ActivityIcon}
            title={`Activity Timeline (${contact.activities.length})`}
            action={
              <Button size="sm" className="gap-1.5" onClick={() => setActivityOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Log Activity
              </Button>
            }
          >
            <ActivityTimeline
              activities={contact.activities}
              onDeleted={fetchContact}
              currentUserId={session?.user?.id}
              isAdmin={isAdmin}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            icon={Kanban}
            title={`Deals (${contact.deals.length})`}
            action={
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDealOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                New Deal
              </Button>
            }
          >
            {contact.deals.length === 0 ? (
              <EmptyState icon={Kanban} title="No deals yet" description="Create a deal to start tracking this opportunity." />
            ) : (
              <div className="divide-y divide-border">
                {contact.deals.map((deal) => (
                  <div key={deal.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/deals/${deal.id}`} className="block truncate text-xs font-semibold text-foreground hover:text-primary">
                        {deal.title}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">Close {formatDate(deal.expectedCloseDate)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-xs font-bold">{formatINR(deal.value)}</span>
                      <StageBadge stage={deal.stage} className="text-[10px]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            icon={CheckSquare}
            title={`Tasks (${contact.tasks.filter((t) => t.status === "OPEN").length} open)`}
            action={
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setEditingTask(null);
                  setTaskOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                New Task
              </Button>
            }
          >
            <TaskList
              tasks={contact.tasks}
              onChanged={fetchContact}
              onEdit={(t) => {
                setEditingTask(t);
                setTaskOpen(true);
              }}
            />
          </SectionCard>
        </div>
      </div>

      <ContactDialog
        open={editOpen}
        initialData={{
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          jobTitle: contact.jobTitle,
          companyId: contact.companyId,
          status: contact.status,
          source: contact.source,
        }}
        companies={companies}
        users={users}
        isAdmin={isAdmin}
        onClose={() => setEditOpen(false)}
        onSaved={fetchContact}
      />
      <ActivityModal open={activityOpen} contactId={contact.id} onClose={() => setActivityOpen(false)} onLogged={fetchContact} />
      <DealDialog
        open={dealOpen}
        contacts={contactOptions}
        companies={companies}
        users={users}
        isAdmin={isAdmin}
        defaultContactId={contact.id}
        defaultCompanyId={contact.companyId ?? undefined}
        onClose={() => setDealOpen(false)}
        onSaved={fetchContact}
      />
      <TaskDialog
        open={taskOpen}
        initialData={editingTask}
        contactId={contact.id}
        contextLabel={fullName}
        users={users}
        isAdmin={isAdmin}
        onClose={() => {
          setTaskOpen(false);
          setEditingTask(null);
        }}
        onSaved={fetchContact}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="Delete Contact?"
        description="This also deletes the contact's deals, activities and tasks. This cannot be undone."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
