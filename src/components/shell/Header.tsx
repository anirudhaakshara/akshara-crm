"use client";

import { useState } from "react";
import { Menu, Search } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { CommandPalette, useCommandPaletteShortcut } from "@/features/search/components/CommandPalette";

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  useCommandPaletteShortcut(setSearchOpen);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-3 border-b border-border bg-card/80 px-4 md:px-6 backdrop-blur-md">
      <div className="flex flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="p-2 rounded-lg border border-input md:hidden hover:bg-accent text-foreground transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-input bg-background px-3 text-xs text-muted-foreground hover:bg-accent transition-colors"
          aria-label="Search deals, contacts and companies (Ctrl+K)"
          aria-keyshortcuts="Control+K Meta+K"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">Search…</span>
          <kbd className="ml-auto hidden sm:inline-flex rounded border border-border px-1.5 py-0.5 text-[10px] font-medium">Ctrl K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="h-5 w-[1px] bg-border" aria-hidden />
        <UserMenu />
      </div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
