"use client";

import { Menu, Activity } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 md:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-lg border border-input md:hidden hover:bg-accent text-foreground transition-colors"
          aria-label="Open mobile menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border">
          <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
          <span>Akshara Engine Active</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="h-5 w-[1px] bg-border" />
        <UserMenu />
      </div>
    </header>
  );
}
