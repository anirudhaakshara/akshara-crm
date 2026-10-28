"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Kanban,
  CheckSquare,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Shield,
  BriefcaseBusiness,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Companies", href: "/companies", icon: Building2 },
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "Deals & Pipeline", href: "/deals", icon: Kanban },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
  ];

  const adminNavigation = [
    { name: "ML Insights", href: "/ml/insights", icon: BrainCircuit },
    { name: "User Management", href: "/settings/users", icon: Shield },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-card border-r border-border">
      <div>
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-bold tracking-tight text-foreground"
            onClick={onCloseMobile}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-base font-bold bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
                  Akshara CRM
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                  Sales & ML
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Main Nav */}
        <div className="px-3 py-4 space-y-6">
          <div>
            {!collapsed && (
              <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Sales Pipeline
              </p>
            )}
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                        isActive ? "text-primary-foreground" : "text-muted-foreground"
                      )}
                    />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Admin Nav */}
          {isAdmin && (
            <div>
              {!collapsed && (
                <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Intelligence & Admin
                </p>
              )}
              <nav className="space-y-1">
                {adminNavigation.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onCloseMobile}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                      title={collapsed ? item.name : undefined}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                          isActive ? "text-primary-foreground" : "text-muted-foreground"
                        )}
                      />
                      {!collapsed && <span>{item.name}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <div className="rounded-lg bg-muted/60 p-3 text-xs">
            <p className="font-semibold text-foreground">Akshara CRM v0.1</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              INR Pipeline & ML Engine
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:block transition-all duration-300 ease-in-out shrink-0 select-none",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (responsive down to 375px) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative flex w-72 max-w-[85vw] flex-col bg-card shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
