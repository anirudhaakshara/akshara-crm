import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background via-muted/30 to-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
        <LoginForm />
      </Suspense>

      <div className="mt-8 text-center text-xs text-muted-foreground">
        Akshara CRM &bull; Built with Next.js 14, Supabase & In-House Machine Learning
      </div>
    </div>
  );
}
