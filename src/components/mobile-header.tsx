"use client";

import { useSession, signOut } from "next-auth/react";
import { Car, LogOut } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function MobileHeader() {
  const { data: session } = useSession();

  return (
    <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <Car className="h-5 w-5 text-primary" />
        <span className="font-bold">Handover</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground hidden sm:block">
          {session?.user?.name}
        </span>
        <ThemeToggle />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
