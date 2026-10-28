"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/feedback/Toast";
import { apiFetch, ApiClientError, errorMessage } from "@/lib/api-client";
import { toDateInputValue } from "@/lib/formatters";
import { dealSchema, DEAL_STAGES, STAGE_LABELS, type DealStageValue } from "@/features/deals/schemas/deal";
import type { CompanyOption, ContactOption, UserOption } from "@/hooks/useOptions";
import type { DealRecord } from "@/features/deals/types";

interface DealDialogProps {
  open: boolean;
  initialData?: Pick<
    DealRecord,
    "id" | "title" | "value" | "stage" | "expectedCloseDate" | "contactId" | "companyId" | "ownerId" | "lostReason"
  > | null;
  contacts: ContactOption[];
  companies: CompanyOption[];
  users?: UserOption[];
  isAdmin?: boolean;
  /** Pre-select (and lock) the contact when creating from a contact page. */
  defaultContactId?: string;
  defaultCompanyId?: string;
  defaultStage?: DealStageValue;
  onClose: () => void;
  onSaved: (deal: DealRecord) => void;
}

interface FormState {
  title: string;
  value: string;
  stage: DealStageValue;
  expectedCloseDate: string;
  contactId: string;
  companyId: string;
  ownerId: string;
  lostReason: string;
}

function defaultCloseDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return toDateInputValue(d);
}

export function DealDialog({
  open,
  initialData,
  contacts,
  companies,
  users = [],
  isAdmin = false,
  defaultContactId,
  defaultCompanyId,
  defaultStage = "NEW",
  onClose,
  onSaved,
}: DealDialogProps) {
  const toast = useToast();
  const isEditing = !!initialData?.id;
  const [form, setForm] = useState<FormState>({
    title: "",
    value: "",
    stage: defaultStage,
    expectedCloseDate: defaultCloseDate(),
    contactId: "",
    companyId: "",
    ownerId: "",
    lostReason: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setForm({
        title: initialData.title,
        value: String(Number(initialData.value)),
        stage: initialData.stage,
        expectedCloseDate: toDateInputValue(initialData.expectedCloseDate),
        contactId: initialData.contactId,
        companyId: initialData.companyId ?? "",
        ownerId: "",
        lostReason: initialData.lostReason ?? "",
      });
    } else {
      setForm({
        title: "",
        value: "",
        stage: defaultStage,
        expectedCloseDate: defaultCloseDate(),
        contactId: defaultContactId ?? "",
        companyId: defaultCompanyId ?? "",
        ownerId: "",
        lostReason: "",
      });
    }
    setErrors({});
    setFormError(null);
    // Reset only when the dialog opens or switches record, not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData?.id, defaultContactId, defaultCompanyId, defaultStage]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onContactChange(contactId: string) {
    const contact = contacts.find((c) => c.id === contactId);
    setForm((f) => ({
      ...f,
      contactId,
      // Follow the contact's company unless the user already picked one.
      companyId: f.companyId || contact?.company?.id || "",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title.trim(),
      value: form.value === "" ? undefined : Number(form.value),
      stage: form.stage,
      expectedCloseDate: form.expectedCloseDate,
      contactId: form.contactId,
      companyId: form.companyId || null,
      lostReason: form.stage === "LOST" ? form.lostReason.trim() : null,
      ...(isAdmin && form.ownerId ? { ownerId: form.ownerId } : {}),
    };

    const parsed = dealSchema.safeParse(payload);
    const fieldErrors: Record<string, string> = {};
    if (!parsed.success) {
      parsed.error.issues.forEach((i) => (fieldErrors[i.path.join(".")] ??= i.message));
    }
    if (payload.value === undefined) fieldErrors.value = "Value is required";
    if (form.stage === "LOST" && !form.lostReason.trim()) fieldErrors.lostReason = "Lost reason is required";
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      const saved = await apiFetch<DealRecord>(isEditing ? `/api/deals/${initialData?.id}` : "/api/deals", {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      toast.success(isEditing ? "Deal updated" : "Deal created");
      onSaved(saved);
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError && err.fields) {
        setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0]])));
      }
      setFormError(errorMessage(err, "Failed to save deal"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={isEditing ? "Edit Deal" : "New Deal"} onClose={onClose}>
      {formError && (
        <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-red-700 dark:text-red-400">
          {formError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5" noValidate>
        <Field label="Deal title" htmlFor="d-title" required error={errors.title}>
          <Input id="d-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. ERP rollout — Phase 1" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Value (₹)" htmlFor="d-value" required error={errors.value}>
            <Input
              id="d-value"
              type="number"
              inputMode="decimal"
              min={0}
              step="1"
              value={form.value}
              onChange={(e) => set("value", e.target.value)}
              placeholder="500000"
            />
          </Field>
          <Field label="Expected close date" htmlFor="d-close" required error={errors.expectedCloseDate}>
            <Input id="d-close" type="date" value={form.expectedCloseDate} onChange={(e) => set("expectedCloseDate", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Contact" htmlFor="d-contact" required error={errors.contactId}>
            <Select
              id="d-contact"
              value={form.contactId}
              onChange={(e) => onContactChange(e.target.value)}
              disabled={!!defaultContactId && !isEditing}
            >
              <option value="">Select a contact</option>
              {form.contactId && !contacts.some((c) => c.id === form.contactId) && (
                <option value={form.contactId}>Current contact</option>
              )}
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                  {c.company ? ` — ${c.company.name}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Company" htmlFor="d-company" error={errors.companyId}>
            <Select id="d-company" value={form.companyId} onChange={(e) => set("companyId", e.target.value)}>
              <option value="">No company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Stage" htmlFor="d-stage">
            <Select id="d-stage" value={form.stage} onChange={(e) => set("stage", e.target.value as DealStageValue)}>
              {DEAL_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          {isAdmin && users.length > 0 && (
            <Field label="Owner" htmlFor="d-owner">
              <Select id="d-owner" value={form.ownerId} onChange={(e) => set("ownerId", e.target.value)}>
                <option value="">{isEditing ? "Keep current owner" : "Assign to me"}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
        {form.stage === "LOST" && (
          <Field label="Lost reason" htmlFor="d-lost" required error={errors.lostReason}>
            <Textarea id="d-lost" rows={2} value={form.lostReason} onChange={(e) => set("lostReason", e.target.value)} placeholder="Why was this deal lost?" />
          </Field>
        )}
        <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Deal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
