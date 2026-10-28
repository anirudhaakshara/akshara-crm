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
import { companySchema } from "@/features/companies/schemas/company";
import { INDUSTRIES } from "@/features/companies/constants";
import type { UserOption } from "@/hooks/useOptions";

export interface CompanyFormData {
  id?: string;
  name: string;
  industry: string;
  website?: string | null;
  city: string;
  phone?: string | null;
  ownerId?: string;
}

interface CompanyDialogProps {
  open: boolean;
  initialData?: CompanyFormData | null;
  users?: UserOption[];
  isAdmin?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY = { name: "", industry: "", website: "", city: "", phone: "", ownerId: "" };

export function CompanyDialog({ open, initialData, users = [], isAdmin = false, onClose, onSaved }: CompanyDialogProps) {
  const toast = useToast();
  const isEditing = !!initialData?.id;
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      initialData
        ? {
            name: initialData.name ?? "",
            industry: initialData.industry ?? "",
            website: initialData.website ?? "",
            city: initialData.city ?? "",
            phone: initialData.phone ?? "",
            ownerId: "",
          }
        : EMPTY
    );
    setErrors({});
    setFormError(null);
    // Reset only when the dialog opens or switches record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData?.id]);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const website = form.website.trim();
    const payload = {
      name: form.name.trim(),
      industry: form.industry.trim(),
      // Accept "acme.in" as well as "https://acme.in".
      website: website && !/^https?:\/\//i.test(website) ? `https://${website}` : website,
      city: form.city.trim(),
      phone: form.phone.trim(),
      ...(isAdmin && form.ownerId ? { ownerId: form.ownerId } : {}),
    };

    const parsed = companySchema.safeParse(payload);
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
      await apiFetch(isEditing ? `/api/companies/${initialData?.id}` : "/api/companies", {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      toast.success(isEditing ? "Company updated" : "Company created");
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError && err.fields) {
        setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0]])));
      }
      setFormError(errorMessage(err, "Failed to save company"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={isEditing ? "Edit Company" : "New Company"} onClose={onClose}>
      {formError && (
        <div role="alert" className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-red-700 dark:text-red-300">
          {formError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5" noValidate>
        <Field label="Company name" htmlFor="co-name" required error={errors.name}>
          <Input id="co-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Infosys Techworks" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Industry" htmlFor="co-industry" required error={errors.industry}>
            <Input
              id="co-industry"
              list="co-industry-options"
              value={form.industry}
              onChange={(e) => set("industry", e.target.value)}
              placeholder="e.g. FinTech"
            />
            <datalist id="co-industry-options">
              {INDUSTRIES.map((i) => (
                <option key={i} value={i} />
              ))}
            </datalist>
          </Field>
          <Field label="City" htmlFor="co-city" required error={errors.city}>
            <Input id="co-city" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Bengaluru" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Website" htmlFor="co-website" error={errors.website}>
            <Input id="co-website" inputMode="url" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="example.in" />
          </Field>
          <Field label="Phone" htmlFor="co-phone" error={errors.phone}>
            <Input id="co-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 80 2852 0261" />
          </Field>
        </div>
        {isAdmin && users.length > 0 && (
          <Field label="Account owner" htmlFor="co-owner">
            <Select id="co-owner" value={form.ownerId} onChange={(e) => set("ownerId", e.target.value)}>
              <option value="">{isEditing ? "Keep current owner" : "Assign to me"}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
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
            {isEditing ? "Save Changes" : "Create Company"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
