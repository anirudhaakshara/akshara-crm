"use client";

import React from "react";
import { AlertTriangle, Loader2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDialogA11y } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation prompt (role="alertdialog"). Focus starts on Cancel so Enter never deletes by accident.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "destructive",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useDialogA11y(open, loading ? () => {} : onCancel);
  const titleId = React.useId();
  const descId = React.useId();

  if (!open) return null;
  const Icon = variant === "destructive" ? AlertTriangle : HelpCircle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={loading ? undefined : onCancel} aria-hidden />
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl outline-none animate-in"
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              variant === "destructive" ? "bg-destructive/15 text-red-700 dark:text-red-400" : "bg-primary/10 text-primary"
            )}
            aria-hidden
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 id={titleId} className="text-base font-bold text-foreground">
              {title}
            </h3>
            <p id={descId} className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={onCancel} data-autofocus>
            {cancelLabel}
          </Button>
          <Button type="button" variant={variant} size="sm" disabled={loading} onClick={onConfirm}>
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Working…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
