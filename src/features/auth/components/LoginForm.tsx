"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { BriefcaseBusiness, Lock, Mail, Loader2, AlertCircle } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password,
        callbackUrl,
      });

      if (!res?.ok) {
        setError(res?.error && res.error !== "CredentialsSignin" ? res.error : "Invalid email or password");
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  function fillDemo(userEmail: string, userPass: string) {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl text-card-foreground">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md mb-3">
          <BriefcaseBusiness className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Akshara CRM</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Sign in to access your sales pipeline & ML intelligence
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-5 flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" htmlFor="email">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@akshara.test"
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>
      </form>

      {/* Quick Demo Credentials */}
      <div className="mt-6 border-t border-border pt-4">
        <p className="text-[11px] font-semibold text-muted-foreground text-center mb-2.5">
          Quick Demo Credentials
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => fillDemo("admin@akshara.test", "Admin@123")}
            className="flex flex-col items-center justify-center rounded-lg border border-border p-2 hover:bg-accent text-left transition-colors"
          >
            <span className="font-semibold text-foreground text-[11px]">Admin</span>
            <span className="text-[10px] text-muted-foreground">Full Access</span>
          </button>
          <button
            type="button"
            onClick={() => fillDemo("rahul.sharma@akshara.test", "Rep@123")}
            className="flex flex-col items-center justify-center rounded-lg border border-border p-2 hover:bg-accent text-left transition-colors"
          >
            <span className="font-semibold text-foreground text-[11px]">Sales Rep</span>
            <span className="text-[10px] text-muted-foreground">Rahul Sharma</span>
          </button>
        </div>
      </div>
    </div>
  );
}
