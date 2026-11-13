"use client";

import {
  Bookmark,
  Crop,
  History,
  Images,
  KeyRound,
  LayoutDashboard,
  LogIn,
  Menu,
  Settings,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { useImageStore } from "@/store/image-store";
import { DashboardProvider } from "./DashboardContext";

type NavItem = { href: string; label: string; icon: typeof Images; soon?: string; badge?: "images" };

const NAV: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: "/app/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/app", label: "Bulk Editor", icon: Images, badge: "images" },
      { href: "/app/crop", label: "Crop & Rotate", icon: Crop },
    ],
  },
  {
    title: "Library",
    items: [
      { href: "#", label: "Saved Presets", icon: Bookmark, soon: "Phase 3" },
      { href: "#", label: "History", icon: History, soon: "Phase 3" },
    ],
  },
  {
    title: "AI",
    items: [
      { href: "#", label: "AI Tools", icon: Sparkles, soon: "Soon" },
      { href: "#", label: "API Key", icon: KeyRound, soon: "Soon" },
    ],
  },
  {
    title: "Account",
    items: [{ href: "/app/settings", label: "Settings", icon: Settings }],
  },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const count = useImageStore((s) => s.items.length);
  return (
    <nav className="space-y-5" aria-label="Dashboard">
      {NAV.map((group, gi) => (
        <div key={gi}>
          {group.title && <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-faint">{group.title}</p>}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.href === pathname;
              if (item.soon) {
                return (
                  <li key={item.label}>
                    <span className="flex h-9 cursor-not-allowed items-center gap-3 rounded-lg px-3 text-sm text-faint/70">
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                      <span className="rounded border border-line px-1.5 text-[10px]">{item.soon}</span>
                    </span>
                  </li>
                );
              }
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                      active ? "bg-surface-3 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge === "images" && count > 0 && (
                      <span className="rounded-full bg-white px-1.5 text-[11px] font-medium text-black">{count}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserBlock({ user, onNavigate }: { user: { name?: string | null; email?: string | null } | null; onNavigate?: () => void }) {
  if (!user) {
    return (
      <Link
        href="/login?callbackUrl=/app"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm text-muted hover:border-line-strong hover:text-fg"
      >
        <LogIn className="h-4 w-4" />
        <span className="flex-1">Log in to save settings</span>
      </Link>
    );
  }
  const initial = (user.name || user.email || "?").charAt(0).toUpperCase();
  return (
    <Link
      href="/app/account"
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2"
      data-testid="sidebar-user"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-3 text-sm font-medium">
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{user.name || "Account"}</span>
        <span className="block truncate text-xs text-faint">{user.email}</span>
      </span>
      <UserRound className="h-4 w-4 text-faint" />
    </Link>
  );
}

export function DashboardShell({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null } | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <DashboardProvider value={{ loggedIn: !!user, user }}>
      <div className="min-h-dvh lg:pl-64">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-bg lg:flex">
          <div className="flex h-14 items-center px-5">
            <Logo href="/" />
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <NavLinks pathname={pathname} />
          </div>
          <div className="border-t border-line p-3">
            <UserBlock user={user} />
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-bg/85 px-4 backdrop-blur-md lg:hidden">
          <Logo href="/" />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-muted hover:bg-surface-3 hover:text-fg"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-bg">
              <div className="flex h-14 items-center justify-between px-4">
                <Logo href="/" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-muted hover:bg-surface-3 hover:text-fg"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4">
                <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
              </div>
              <div className="border-t border-line p-3">
                <UserBlock user={user} onNavigate={() => setOpen(false)} />
              </div>
            </div>
          </div>
        )}

        <main className="min-w-0">{children}</main>
      </div>
    </DashboardProvider>
  );
}
