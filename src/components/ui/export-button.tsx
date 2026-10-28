"use client";

import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/feedback/Toast";
import { downloadFile, errorMessage } from "@/lib/api-client";

interface ExportButtonProps {
  /** Endpoint including the current filter query string. */
  href: string;
  label?: string;
  fallbackName: string;
}

/** "Export CSV" — downloads every row matching the current filters (server-capped). */
export function ExportButton({ href, label = "Export CSV", fallbackName }: ExportButtonProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const { total, exported } = await downloadFile(href, fallbackName);
      toast.success(
        exported < total
          ? `Exported the first ${exported.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")} rows`
          : `Exported ${exported.toLocaleString("en-IN")} row${exported === 1 ? "" : "s"}`
      );
    } catch (err) {
      toast.error(errorMessage(err, "Export failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={run} disabled={busy}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}
