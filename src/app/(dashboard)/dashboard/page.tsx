import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  Building2,
  Users,
  Kanban,
  CheckSquare,
  Activity,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Quick count check from database
  let counts = {
    users: 0,
    companies: 0,
    contacts: 0,
    deals: 0,
    activities: 0,
    tasks: 0,
  };

  try {
    const [userCount, companyCount, contactCount, dealCount, activityCount, taskCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.company.count(),
        prisma.contact.count(),
        prisma.deal.count(),
        prisma.activity.count(),
        prisma.task.count(),
      ]);

    counts = {
      users: userCount,
      companies: companyCount,
      contacts: contactCount,
      deals: dealCount,
      activities: activityCount,
      tasks: taskCount,
    };
  } catch {
    // If DB is not connected yet, display 0
  }

  const statCards = [
    { name: "Companies", count: counts.companies, icon: Building2, href: "/companies" },
    { name: "Contacts", count: counts.contacts, icon: Users, href: "/contacts" },
    { name: "Deals in Pipeline", count: counts.deals, icon: Kanban, href: "/deals" },
    { name: "Logged Activities", count: counts.activities, icon: Activity, href: "#" },
    { name: "Tasks", count: counts.tasks, icon: CheckSquare, href: "/tasks" },
    { name: "Team Users", count: counts.users, icon: ShieldCheck, href: "/settings/users" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-card to-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary mb-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Phase 1 — v0.1 Foundation Active</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Welcome back, {session?.user?.name || "User"}!
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Role: <span className="font-semibold text-foreground">{session?.user?.role}</span> &bull;
              Akshara CRM core foundation, authentication, and database connectivity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/api/health"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Activity className="h-4 w-4 text-emerald-500" />
              <span>Test /api/health</span>
            </a>
          </div>
        </div>
      </div>

      {/* Database Entity Counts */}
      <div>
        <h2 className="text-base font-semibold mb-3">Database Records Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.name}
                className="rounded-xl border border-border bg-card p-4 shadow-sm hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{stat.name}</span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-bold text-foreground">{stat.count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase 1 Acceptance Checklist */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Phase 1 Checklist & Verification
        </h3>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Next.js 14 App Router + Strict TS</p>
              <p className="text-muted-foreground">Scaffolded with Tailwind, Lucide, and modular feature architecture.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Supabase PostgreSQL + Prisma ORM</p>
              <p className="text-muted-foreground">Complete 7-model schema with explicit onDelete cascades and indexes.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Auth.js / NextAuth & Middleware</p>
              <p className="text-muted-foreground">Credentials provider with bcrypt password hashes and role guarding.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-foreground">App Shell, Theme & INR Formatters</p>
              <p className="text-muted-foreground">Collapsible sidebar, dark/light mode, mobile drawer (375px), and Indian rupee formatting.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
