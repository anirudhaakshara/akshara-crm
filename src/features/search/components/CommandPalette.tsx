"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Building2,
  CheckSquare,
  CornerDownLeft,
  Kanban,
  LayoutDashboard,
  Loader2,
  Search,
  Users,
  BrainCircuit,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { formatINR } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { STAGE_LABELS, type DealStageValue } from "@/features/deals/schemas/deal";

interface SearchResponse {
  q: string;
  companies: { id: string; name: string; city: string; industry: string }[];
  contacts: { id: string; firstName: string; lastName: string; email: string; company: { name: string } | null }[];
  deals: { id: string; title: string; value: string | number; stage: DealStageValue; company: { name: string } | null }[];
}

interface Item {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: LucideIcon;
}

const NAV: Item[] = [
  { id: "nav-dashboard", group: "Go to", title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "nav-companies", group: "Go to", title: "Companies", href: "/companies", icon: Building2 },
  { id: "nav-contacts", group: "Go to", title: "Contacts", href: "/contacts", icon: Users },
  { id: "nav-deals", group: "Go to", title: "Deals & Pipeline", href: "/deals", icon: Kanban },
  { id: "nav-tasks", group: "Go to", title: "Tasks", href: "/tasks", icon: CheckSquare },
];
const ADMIN_NAV: Item[] = [
  { id: "nav-ml", group: "Go to", title: "ML Insights", href: "/ml/insights", icon: BrainCircuit },
  { id: "nav-users", group: "Go to", title: "User Management", href: "/settings/users", icon: Shield },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Global search (Ctrl/Cmd+K). Searches companies, contacts and deals the user can see; with an empty
 * query it offers quick navigation. Fully keyboard-driven: ↑/↓ to move, Enter to open, Esc to close.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (open) {
      restoreFocus.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setResults(null);
      setActive(0);
    } else {
      restoreFocus.current?.focus?.();
    }
  }, [open]);

  // Debounced search; ignores out-of-order responses.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await apiFetch<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`);
        if (!cancelled) {
          setResults(res);
          setFailed(false);
          setActive(0);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open]);

  const items: Item[] = useMemo(() => {
    if (query.trim().length < 2) {
      const nav = [...NAV, ...(isAdmin ? ADMIN_NAV : [])];
      const q = query.trim().toLowerCase();
      return q ? nav.filter((n) => n.title.toLowerCase().includes(q)) : nav;
    }
    if (!results) return [];
    return [
      ...results.deals.map((d) => ({
        id: `deal-${d.id}`,
        group: "Deals",
        title: d.title,
        subtitle: `${formatINR(d.value)} · ${STAGE_LABELS[d.stage]}${d.company ? ` · ${d.company.name}` : ""}`,
        href: `/deals/${d.id}`,
        icon: Kanban,
      })),
      ...results.contacts.map((c) => ({
        id: `contact-${c.id}`,
        group: "Contacts",
        title: `${c.firstName} ${c.lastName}`,
        subtitle: `${c.email}${c.company ? ` · ${c.company.name}` : ""}`,
        href: `/contacts/${c.id}`,
        icon: Users,
      })),
      ...results.companies.map((c) => ({
        id: `company-${c.id}`,
        group: "Companies",
        title: c.name,
        subtitle: `${c.industry} · ${c.city}`,
        href: `/companies/${c.id}`,
        icon: Building2,
      })),
    ];
  }, [query, results, isAdmin]);

  const go = useCallback(
    (item: Item | undefined) => {
      if (!item) return;
      onClose();
      router.push(item.href);
    },
    [onClose, router]
  );

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab") {
      // Keep focus in the dialog; the input is the only tab stop.
      e.preventDefault();
    }
  }

  if (!open) return null;

  const showEmpty = query.trim().length >= 2 && !loading && results && items.length === 0;
  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]" role="presentation">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search deals, contacts, companies…"
            className="h-12 w-full bg-transparent text-sm outline-none focus-visible:outline-none placeholder:text-muted-foreground/70"
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls="command-palette-list"
            aria-activedescendant={items[active] ? `cp-${items[active].id}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-label="Searching" />}
          <kbd className="hidden sm:inline-flex rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">Esc</kbd>
        </div>

        <div ref={listRef} id="command-palette-list" role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto p-2">
          {items.map((item, index) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            const Icon = item.icon;
            return (
              <React.Fragment key={item.id}>
                {header && (
                  <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" aria-hidden>
                    {header}
                  </p>
                )}
                <div
                  id={`cp-${item.id}`}
                  role="option"
                  aria-selected={index === active}
                  data-index={index}
                  onMouseMove={() => setActive(index)}
                  onClick={() => go(item)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2",
                    index === active ? "bg-primary/10 text-foreground" : "text-foreground/90"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", index === active ? "text-primary" : "text-muted-foreground")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{item.title}</p>
                    {item.subtitle && <p className="truncate text-[11px] text-muted-foreground">{item.subtitle}</p>}
                  </div>
                  {index === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />}
                </div>
              </React.Fragment>
            );
          })}
          {showEmpty && (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              No matches for “{query.trim()}”.
            </p>
          )}
          {failed && <p className="px-3 py-4 text-center text-xs text-red-700 dark:text-red-400">Search failed. Check your connection and try again.</p>}
        </div>

        <div className="hidden sm:flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          <span>↑↓ to move</span>
          <span>Enter to open</span>
          <span>Esc to close</span>
          <span className="ml-auto">Type 2+ characters to search records</span>
        </div>
        <p className="sr-only" aria-live="polite">
          {query.trim().length >= 2 && !loading && results ? `${items.length} results` : ""}
        </p>
      </div>
    </div>
  );
}

/** Opens the palette on Ctrl+K / Cmd+K (and "/" when not typing in a field). */
export function useCommandPaletteShortcut(setOpen: (fn: (o: boolean) => boolean) => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setOpen(() => true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
}
