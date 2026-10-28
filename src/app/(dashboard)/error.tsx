"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/ui/error-state";

/** Route-level error boundary for every signed-in page. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4 py-8">
      <ErrorState
        title="This page couldn't be loaded"
        message="Something went wrong while loading this page. Try again, or go back to the dashboard."
        onRetry={reset}
      />
      <p className="text-center text-xs">
        <Link href="/dashboard" className="text-primary hover:underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
