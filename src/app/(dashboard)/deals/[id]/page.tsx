"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Activity as ActivityIcon,
  AlertCircle,
  Building2,
  Calendar,
  CalendarCheck,
  Check,
  CheckSquare,
  ChevronLeft,
  Edit2,
  Gauge,
  Kanban,
  Loader2,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/components/feedback/Toast";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatDate, formatDateTime, formatINR } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useCompanyOptions, useContactOptions, useUserOptions } from "@/hooks/useOptions";
import { ActivityModal } from "@/features/activities/components/ActivityModal";
import { ActivityTimeline, ActivityItem } from "@/features/activities/components/ActivityTimeline";
import { DealDialog } from "@/features/deals/components/DealDialog";
import { LostReasonDialog } from "@/features/deals/components/LostReasonDialog";
import { StageBadge } from "@/features/deals/components/StageBadge";
import { DEAL_STAGES, STAGE_LABELS, type DealStageValue } from "@/features/deals/schemas/deal";
import type { DealRecord } from "@/features/deals/types";
import { WinScoreBadge } from "@/features/ml/components/WinScoreBadge";
import { formatImpact } from "@/lib/ml/explain";
import { scoreBand } from "@/features/ml/types";
import { TaskDialog } from "@/features/tasks/components/TaskDialog";
import { TaskList } from "@/features/tasks/components/TaskList";
import type { TaskRecord } from "@/features/tasks/types";

interface DealDetail extends Omit<DealRecord, "contact" | "company" | "owner"> {
  contact: { id: string; firstName: string; lastName: string; email: string; phone: string | null; jobTitle: string | null } | null;
  company: { id: string; name: string; industry: string; city: string } | null;
  owner: { id: string; name: string; email: string } | null;
  activities: ActivityItem[];
  tasks: TaskRecord[];
}

const OPEN_STAGES: DealStageValue[] = ["NEW", "CONTACTED", "PROPOSAL", "NEGOTIATION"];

function Panel({
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

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const dealId = params.id as string;

  const users = useUserOptions(isAdmin);
  const contacts = useContactOptions();
  const companies = useCompanyOptions();

  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageSaving, setStageSaving] = useState<DealStageValue | null>(null);
  const [lostOpen, setLostOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);

  const fetchDeal = useCallback(async () => {
    try {
      setDeal(await apiFetch<DealDetail>(`/api/deals/${dealId}`));
    } catch (err) {
      toast.error(errorMessage(err, "Deal not found"));
      router.push("/deals");
    } finally {
      setLoading(false);
    }
  }, [dealId, router, toast]);

  useEffect(() => {
    fetchDeal();
  }, [fetchDeal]);

  async function changeStage(stage: DealStageValue, lostReason?: string) {
    if (!deal || stage === deal.stage) return;
    if (stage === "LOST" && !lostReason) {
      setLostOpen(true);
      return;
    }
    const previous = deal;
    setStageSaving(stage);
    setDeal({ ...deal, stage }); // optimistic
    try {
      const updated = await apiFetch<DealRecord>(`/api/deals/${deal.id}`, {
        method: "PATCH",
        body: JSON.stringify({ stage, ...(lostReason ? { lostReason } : {}) }),
      });
      setDeal((d) =>
        d
          ? {
              ...d,
              stage: updated.stage,
              closedAt: updated.closedAt,
              lostReason: updated.lostReason,
              winProbability: updated.winProbability,
              scoreFactors: updated.scoreFactors,
            }
          : d
      );
      toast.success(`Stage changed to ${STAGE_LABELS[stage]}`);
    } catch (err) {
      setDeal(previous);
      toast.error(errorMessage(err, "Failed to change stage"));
    } finally {
      setStageSaving(null);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/deals/${dealId}`, { method: "DELETE" });
      toast.success("Deal deleted");
      router.push("/deals");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete deal"));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 w-32 bg-muted rounded" />
        <div className="h-44 rounded-2xl bg-muted" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="h-80 rounded-xl bg-muted lg:col-span-2" />
          <div className="h-80 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!deal) return null;

  const currentIdx = OPEN_STAGES.indexOf(deal.stage);
  const isClosed = deal.stage === "WON" || deal.stage === "LOST";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link href="/deals" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to Pipeline
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

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{deal.title}</h1>
              <StageBadge stage={deal.stage} />
              <WinScoreBadge stage={deal.stage} winProbability={deal.winProbability} scoreFactors={deal.scoreFactors} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              {deal.company && (
                <Link href={`/companies/${deal.company.id}`} className="flex items-center gap-1 text-primary hover:underline">
                  <Building2 className="h-3.5 w-3.5" />
                  {deal.company.name}
                </Link>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Expected close {formatDate(deal.expectedCloseDate)}
              </span>
              {deal.closedAt && (
                <span className="flex items-center gap-1">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  Closed {formatDate(deal.closedAt)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Owner: {deal.owner?.name ?? "—"}
              </span>
            </div>
          </div>
          <div className="md:text-right shrink-0">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Deal value</span>
            <span className="text-2xl font-bold text-foreground">{formatINR(deal.value)}</span>
          </div>
        </div>

        {/* Stage stepper */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Stage</p>
          <div className="flex flex-wrap gap-1.5">
            {DEAL_STAGES.map((stage) => {
              const idx = OPEN_STAGES.indexOf(stage);
              const reached = !isClosed && idx !== -1 && idx <= currentIdx;
              const active = stage === deal.stage;
              return (
                <button
                  key={stage}
                  type="button"
                  disabled={!!stageSaving}
                  onClick={() => changeStage(stage)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60",
                    active && stage === "WON" && "border-emerald-500 bg-emerald-500 text-white",
                    active && stage === "LOST" && "border-rose-500 bg-rose-500 text-white",
                    active && !isClosed && "border-primary bg-primary text-primary-foreground",
                    !active && reached && "border-primary/40 bg-primary/10 text-primary",
                    !active && !reached && "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {stageSaving === stage ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : reached && !active ? (
                    <Check className="h-3 w-3" />
                  ) : null}
                  {STAGE_LABELS[stage]}
                </button>
              );
            })}
          </div>
          {deal.stage === "LOST" && deal.lostReason && (
            <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                <span className="font-semibold">Lost reason:</span> {deal.lostReason}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Panel
            icon={ActivityIcon}
            title={`Activity Timeline (${deal.activities.length})`}
            action={
              <Button size="sm" className="gap-1.5" onClick={() => setActivityOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Log Activity
              </Button>
            }
          >
            <ActivityTimeline activities={deal.activities} onDeleted={fetchDeal} currentUserId={session?.user?.id} isAdmin={isAdmin} />
          </Panel>
        </div>

        <div className="space-y-6">
          {!isClosed && (
            <Panel icon={Gauge} title="Win Probability">
              {deal.winProbability === null ? (
                <p className="text-xs text-muted-foreground">
                  Not enough data yet. Scores appear once an admin trains the model on at least 30 closed deals.
                </p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold tabular-nums">{Math.round(deal.winProbability * 100)}%</span>
                      <span className="text-[11px] text-muted-foreground">
                        {{ HOT: "Hot", WARM: "Warm", COLD: "Cold" }[scoreBand(deal.winProbability)]}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(deal.winProbability * 100)}%` }} />
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {(deal.scoreFactors?.factors ?? [])
                      .filter((f) => Math.abs(f.impact) >= 0.05)
                      .map((f) => (
                        <li key={f.group} className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-muted-foreground">{f.label}</span>
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              f.impact > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            )}
                          >
                            {formatImpact(f.impact)}
                          </span>
                        </li>
                      ))}
                  </ul>
                  {deal.scoreFactors?.scoredAt && (
                    <p className="text-[10px] text-muted-foreground">Updated {formatDateTime(deal.scoreFactors.scoredAt)}</p>
                  )}
                </div>
              )}
            </Panel>
          )}

          {deal.contact && (
            <Panel icon={User} title="Contact">
              <div className="space-y-1.5 text-xs">
                <Link href={`/contacts/${deal.contact.id}`} className="font-semibold text-foreground hover:text-primary">
                  {deal.contact.firstName} {deal.contact.lastName}
                </Link>
                {deal.contact.jobTitle && <p className="text-muted-foreground">{deal.contact.jobTitle}</p>}
                <a href={`mailto:${deal.contact.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary break-all">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {deal.contact.email}
                </a>
                {deal.contact.phone && (
                  <a href={`tel:${deal.contact.phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary">
                    <Phone className="h-3.5 w-3.5" />
                    {deal.contact.phone}
                  </a>
                )}
              </div>
            </Panel>
          )}

          <Panel
            icon={CheckSquare}
            title={`Tasks (${deal.tasks.filter((t) => t.status === "OPEN").length} open)`}
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
              tasks={deal.tasks}
              onChanged={fetchDeal}
              onEdit={(t) => {
                setEditingTask(t);
                setTaskOpen(true);
              }}
            />
          </Panel>

          <Panel icon={Kanban} title="Details">
            <dl className="grid grid-cols-2 gap-y-2 text-xs">
              <dt className="text-muted-foreground">Created</dt>
              <dd className="text-right">{formatDate(deal.createdAt)}</dd>
              <dt className="text-muted-foreground">Last updated</dt>
              <dd className="text-right">{formatDate(deal.updatedAt)}</dd>
              {deal.company && (
                <>
                  <dt className="text-muted-foreground">Industry</dt>
                  <dd className="text-right">{deal.company.industry}</dd>
                </>
              )}
            </dl>
          </Panel>
        </div>
      </div>

      <DealDialog
        open={editOpen}
        initialData={deal}
        contacts={contacts}
        companies={companies}
        users={users}
        isAdmin={isAdmin}
        onClose={() => setEditOpen(false)}
        onSaved={() => fetchDeal()}
      />
      <LostReasonDialog
        open={lostOpen}
        dealTitle={deal.title}
        loading={stageSaving === "LOST"}
        onConfirm={(reason) => {
          setLostOpen(false);
          changeStage("LOST", reason);
        }}
        onCancel={() => setLostOpen(false)}
      />
      <ActivityModal
        open={activityOpen}
        dealId={deal.id}
        contactId={deal.contactId}
        onClose={() => setActivityOpen(false)}
        onLogged={fetchDeal}
      />
      <TaskDialog
        open={taskOpen}
        initialData={editingTask}
        dealId={deal.id}
        contactId={deal.contactId}
        contextLabel={deal.title}
        users={users}
        isAdmin={isAdmin}
        onClose={() => {
          setTaskOpen(false);
          setEditingTask(null);
        }}
        onSaved={fetchDeal}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="Delete Deal?"
        description="This deal and its activities and tasks will be permanently removed."
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
