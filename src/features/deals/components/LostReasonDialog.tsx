"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";

const QUICK_REASONS = ["Price too high", "Chose a competitor", "No budget", "No decision / went silent", "Timing not right"];

interface LostReasonDialogProps {
  open: boolean;
  dealTitle?: string;
  loading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function LostReasonDialog({ open, dealTitle, loading, onConfirm, onCancel }: LostReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please give a reason");
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <Modal open={open} title="Mark deal as lost" onClose={loading ? () => {} : onCancel} className="max-w-md">
      <form onSubmit={submit} className="mt-4 space-y-3.5">
        {dealTitle && (
          <p className="text-xs text-muted-foreground">
            Why was <span className="font-semibold text-foreground">{dealTitle}</span> lost?
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setReason(r);
                setError(null);
              }}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                reason === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <Field label="Lost reason" htmlFor="lost-reason" required error={error ?? undefined}>
          <Textarea
            id="lost-reason"
            rows={3}
            autoFocus
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            placeholder="e.g. Went with a cheaper vendor"
          />
        </Field>
        <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" size="sm" disabled={loading}>
            {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Mark as Lost
          </Button>
        </div>
      </form>
    </Modal>
  );
}
