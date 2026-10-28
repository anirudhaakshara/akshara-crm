"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Mail, Calendar, FileText, Loader2, X } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-50 zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Log New Activity</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Activity Type Selector */}
          <div>
            <label className="block text-xs font-semibold mb-1.5">Activity Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {types.map((t) => {
                const Icon = t.icon;
                const isSelected = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border hover:bg-accent text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px]">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Subject / Summary *</label>
            <Input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Discovery call with CTO on security compliance"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Date & Time</label>
            <Input
              type="datetime-local"
              required
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Detailed Notes</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline key discussion points, customer feedback, SLA queries, or commitments..."
              className="w-full rounded-lg border border-input bg-background p-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60 resize-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  <span>Logging...</span>
                </>
              ) : (
                <span>Log Activity</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
