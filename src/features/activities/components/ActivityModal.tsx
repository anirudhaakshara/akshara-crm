"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Mail, Calendar, FileText, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/feedback/Toast";

interface ActivityModalProps {
  open: boolean;
  contactId?: string;
  dealId?: string;
  onClose: () => void;
  onLogged: () => void;
}

export function ActivityModal({
  open,
  contactId,
  dealId,
  onClose,
  onLogged,
}: ActivityModalProps) {
  const toast = useToast();
  const [type, setType] = useState<"CALL" | "EMAIL" | "MEETING" | "NOTE">("CALL");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  // datetime-local expects local time (not UTC), e.g. "2026-10-29T14:30"
  const [occurredAt, setOccurredAt] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setType("CALL");
      setSubject("");
      setDescription("");
      setOccurredAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      type,
      subject: subject.trim(),
      description: description.trim() || undefined,
      occurredAt: new Date(occurredAt).toISOString(),
      contactId: contactId || null,
      dealId: dealId || null,
    };

    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to log activity");
      }

      toast.success("Activity logged successfully");
      setSubject("");
      setDescription("");
      onLogged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error logging activity");
    } finally {
      setLoading(false);
    }
  }

  const types = [
    { value: "CALL", label: "Phone Call", icon: Phone },
    { value: "EMAIL", label: "Email", icon: Mail },
    { value: "MEETING", label: "Meeting", icon: Calendar },
    { value: "NOTE", label: "Quick Note", icon: FileText },
  ] as const;

  return (
    <Modal open={open} title="Log activity" onClose={onClose}>
      {error && (
        <div role="alert" className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <fieldset>
          <legend className="block text-xs font-semibold mb-1.5">Activity type</legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Activity type">
            {types.map((t) => {
              const Icon = t.icon;
              const isSelected = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setType(t.value)}
                  className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    isSelected ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="text-[11px]">{t.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <Field label="Subject" htmlFor="act-subject" required>
          <Input
            id="act-subject"
            required
            minLength={2}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Discovery call with CTO on security compliance"
          />
        </Field>

        <Field label="Date & time" htmlFor="act-when" required>
          <Input id="act-when" type="datetime-local" required value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
        </Field>

        <Field label="Notes" htmlFor="act-notes">
          <Textarea
            id="act-notes"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Key discussion points, objections, next steps…"
          />
        </Field>

        <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Logging…
              </>
            ) : (
              "Log Activity"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
