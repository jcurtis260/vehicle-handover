"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Logo } from "./logo";
import {
  LayoutDashboard,
  ClipboardPlus,
  ClipboardList,
  Search,
  Settings,
  LogOut,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/handovers/new", label: "New Handover", icon: ClipboardPlus },
  { href: "/handovers", label: "All Handovers", icon: ClipboardList, exact: true },
  { href: "/search", label: "Search", icon: Search },
  { href: "/changelog", label: "Changelog", icon: FileText, permission: "changelog" as const },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r border-border bg-card h-screen sticky top-0">
      <div className="flex items-center justify-center p-5 border-b border-border">
        <Logo className="w-44 h-auto" color="currentColor" />
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems
          .filter((item) => {
            if (item.adminOnly && !isAdmin) return false;
            if ("permission" in item && item.permission === "changelog") {
              return isAdmin || session?.user?.canViewChangelog;
            }
            return true;
          })
          .map((item) => {
            const active = "exact" in item && item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <p className="font-medium truncate">{session?.user?.name}</p>
            <p className="text-muted-foreground text-xs truncate">
              {session?.user?.email}
            </p>
          </div>
          <ThemeToggle />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
