"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Shield, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { ErrorState } from "@/components/ui/error-state";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/components/feedback/Toast";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import { CreateUserDialog } from "@/features/users/components/CreateUserDialog";
import { ROLE_LABELS, USER_ROLES, type UserRoleValue } from "@/features/users/schemas/user";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRoleValue;
  createdAt: string;
  _count: { deals: number; contacts: number; companies: number; tasks: number };
}

export default function UserManagementPage() {
  const { data: session, update } = useSession();
  const toast = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState<{ user: UserRow; role: UserRoleValue } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ users: UserRow[] }>("/api/users");
      setUsers(res.users);
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err, "Failed to load users"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const adminCount = users.filter((u) => u.role === "ADMIN").length;

  async function applyRole() {
    if (!pending) return;
    setSaving(true);
    try {
      await apiFetch(`/api/users/${pending.user.id}`, { method: "PATCH", body: JSON.stringify({ role: pending.role }) });
      toast.success(`${pending.user.name} is now ${ROLE_LABELS[pending.role].toLowerCase()}`);
      setPending(null);
      await load();
      await update(); // refresh our own session in case it changed
    } catch (err) {
      toast.error(errorMessage(err, "Failed to change role"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-primary" aria-hidden />
            User Management
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Create team accounts and set roles. Admins see every record; sales reps see only their own.
          </p>
        </div>
        <Button className="gap-1.5 shadow-sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create user
        </Button>
      </div>

      {loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Team members and their roles</caption>
              <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="p-3.5">User</th>
                  <th scope="col" className="p-3.5">Role</th>
                  <th scope="col" className="p-3.5">Owns</th>
                  <th scope="col" className="p-3.5">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 4 }).map((__, j) => (
                          <td key={j} className="p-3.5">
                            <div className="h-4 w-3/4 rounded bg-muted" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : users.map((u) => {
                      const isSelf = u.id === session?.user?.id;
                      const lastAdmin = u.role === "ADMIN" && adminCount <= 1;
                      const locked = isSelf || lastAdmin;
                      return (
                        <tr key={u.id} className="hover:bg-muted/30">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3 min-w-[200px]">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-[11px] font-semibold text-primary" aria-hidden>
                                {u.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                              </span>
                              <div>
                                <p className="font-semibold text-foreground">
                                  {u.name} {isSelf && <Badge variant="secondary" className="ml-1">You</Badge>}
                                </p>
                                <p className="text-[11px] text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <Select
                              aria-label={`Role for ${u.name}`}
                              className="w-36"
                              value={u.role}
                              disabled={locked}
                              title={isSelf ? "You can't change your own role" : lastAdmin ? "There must always be at least one admin" : undefined}
                              onChange={(e) => setPending({ user: u, role: e.target.value as UserRoleValue })}
                            >
                              {USER_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {ROLE_LABELS[r]}
                                </option>
                              ))}
                            </Select>
                            {locked && (
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {isSelf ? "Your own role" : "Only admin"}
                              </p>
                            )}
                          </td>
                          <td className="p-3.5 text-[11px] text-muted-foreground whitespace-nowrap">
                            {u._count.deals} deals · {u._count.contacts} contacts · {u._count.tasks} tasks
                          </td>
                          <td className="p-3.5 text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(u.createdAt)}</td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground">
        <UserCog className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
        <p>Role changes take effect immediately on the server. The user&apos;s menu and sidebar update the next time their session refreshes.</p>
      </div>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <ConfirmDialog
        open={!!pending}
        title={pending?.role === "ADMIN" ? `Make ${pending?.user.name} an admin?` : `Change ${pending?.user.name} to sales rep?`}
        description={
          pending?.role === "ADMIN"
            ? "Admins can see and edit every record, manage users and retrain the model."
            : "They will only see records they own, and lose access to admin pages."
        }
        confirmLabel="Change role"
        variant="default"
        loading={saving}
        onConfirm={applyRole}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
