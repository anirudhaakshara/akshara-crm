import Link from "next/link";
import { Compass } from "lucide-react";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
      <Compass className="h-10 w-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-bold text-foreground">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link
        href="/dashboard"
        className="mt-2 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Go to dashboard
      </Link>
    </main>
  );
}
