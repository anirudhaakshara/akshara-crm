"use client";

import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/feedback/Toast";
import { apiFetch, ApiClientError, errorMessage } from "@/lib/api-client";
import { createUserSchema, ROLE_LABELS, USER_ROLES, type UserRoleValue } from "@/features/users/schemas/user";

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateUserDialog({ open, onClose, onCreated }: CreateUserDialogProps) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRoleValue>("SALES_REP");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setRole("SALES_REP");
    setErrors({});
    setFormError(null);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name, email, password, role };
    const parsed = createUserSchema.safeParse(payload);
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
      await apiFetch("/api/users", { method: "POST", body: JSON.stringify(parsed.data) });
      toast.success(`${parsed.data.name} can now sign in as ${ROLE_LABELS[parsed.data.role].toLowerCase()}`);
      onCreated();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        setErrors({ email: "A user with this email already exists" });
      } else if (err instanceof ApiClientError && err.fields) {
        setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0]])));
      } else {
        setFormError(errorMessage(err, "Failed to create user"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="Create user" onClose={onClose}>
      {formError && (
        <div role="alert" className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-red-700 dark:text-red-400">
          {formError}
        </div>
      )}
      <form onSubmit={submit} className="mt-4 space-y-3.5" noValidate>
        <Field label="Full name" htmlFor="u-name" required error={errors.name}>
          <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kavya Hegde" autoComplete="off" />
        </Field>
        <Field label="Email" htmlFor="u-email" required error={errors.email}>
          <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kavya.hegde@akshara.test" autoComplete="off" />
        </Field>
        <Field label="Role" htmlFor="u-role">
          <Select id="u-role" value={role} onChange={(e) => setRole(e.target.value as UserRoleValue)}>
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Temporary password" htmlFor="u-password" required error={errors.password}>
          <div className="relative">
            <Input
              id="u-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="pr-9"
              aria-describedby="u-password-hint"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p id="u-password-hint" className="mt-1 text-[11px] text-muted-foreground">
            At least 8 characters, with a letter and a number. Share it with the user securely.
          </p>
        </Field>
        <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Create user
          </Button>
        </div>
      </form>
    </Modal>
  );
}
