"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/feedback/Toast";
import { apiFetch, ApiClientError, errorMessage } from "@/lib/api-client";
import { contactSchema } from "@/features/contacts/schemas/contact";
import {
  CONTACT_SOURCES,
  CONTACT_STATUSES,
  SOURCE_LABELS,
  STATUS_LABELS,
  type ContactSourceValue,
  type ContactStatusValue,
} from "@/features/contacts/constants";
import type { CompanyOption, UserOption } from "@/hooks/useOptions";

export interface ContactFormData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  jobTitle?: string | null;
  companyId?: string | null;
  ownerId?: string;
  status: ContactStatusValue;
  source: ContactSourceValue;
}

interface ContactDialogProps {
  open: boolean;
  initialData?: ContactFormData | null;
  companies: CompanyOption[];
  users?: UserOption[];
  isAdmin?: boolean;
  defaultCompanyId?: string;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY: ContactFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  companyId: "",
  ownerId: "",
  status: "LEAD",
  source: "OTHER",
};

export function ContactDialog({
  open,
  initialData,
  companies,
  users = [],
  isAdmin = false,
  defaultCompanyId,
  onClose,
  onSaved,
}: ContactDialogProps) {
  const toast = useToast();
  const isEditing = !!initialData?.id;
  const [form, setForm] = useState<ContactFormData>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      initialData
        ? { ...EMPTY, ...initialData, phone: initialData.phone ?? "", jobTitle: initialData.jobTitle ?? "", companyId: initialData.companyId ?? "" }
        : { ...EMPTY, companyId: defaultCompanyId ?? "" }
    );
    setErrors({});
    setFormError(null);
    // Reset only when the dialog opens or switches record, not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData?.id, defaultCompanyId]);

  function set<K extends keyof ContactFormData>(key: K, value: ContactFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone?.trim() || "",
      jobTitle: form.jobTitle?.trim() || "",
      companyId: form.companyId || null,
      status: form.status,
      source: form.source,
      ...(isAdmin && form.ownerId ? { ownerId: form.ownerId } : {}),
    };

    // Same Zod schema as the server, so errors show inline before the round trip.
    const parsed = contactSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (fieldErrors[i.path.join(".")] ??= i.message));
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      await apiFetch(isEditing ? `/api/contacts/${initialData?.id}` : "/api/contacts", {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      toast.success(isEditing ? "Contact updated" : "Contact created");
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError && err.fields) {
        setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0]])));
      }
      setFormError(errorMessage(err, "Failed to save contact"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={isEditing ? "Edit Contact" : "New Contact"} onClose={onClose}>
      {formError && (
        <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
          {formError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="First name" htmlFor="c-first" required error={errors.firstName}>
            <Input id="c-first" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Ananya" />
          </Field>
          <Field label="Last name" htmlFor="c-last" required error={errors.lastName}>
            <Input id="c-last" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Iyer" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Email" htmlFor="c-email" required error={errors.email}>
            <Input id="c-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="ananya@company.in" />
          </Field>
          <Field label="Phone" htmlFor="c-phone" error={errors.phone}>
            <Input id="c-phone" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98450 12345" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Job title" htmlFor="c-title" error={errors.jobTitle}>
            <Input id="c-title" value={form.jobTitle ?? ""} onChange={(e) => set("jobTitle", e.target.value)} placeholder="Head of Procurement" />
          </Field>
          <Field label="Company" htmlFor="c-company" error={errors.companyId}>
            <Select id="c-company" value={form.companyId ?? ""} onChange={(e) => set("companyId", e.target.value)}>
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
          <Field label="Status" htmlFor="c-status">
            <Select id="c-status" value={form.status} onChange={(e) => set("status", e.target.value as ContactStatusValue)}>
              {CONTACT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Source" htmlFor="c-source">
            <Select id="c-source" value={form.source} onChange={(e) => set("source", e.target.value as ContactSourceValue)}>
              {CONTACT_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {isAdmin && users.length > 0 && (
          <Field label="Owner" htmlFor="c-owner">
            <Select id="c-owner" value={form.ownerId ?? ""} onChange={(e) => set("ownerId", e.target.value)}>
              <option value="">{isEditing ? "Keep current owner" : "Assign to me"}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role === "ADMIN" ? "Admin" : "Sales rep"})
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Contact"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
