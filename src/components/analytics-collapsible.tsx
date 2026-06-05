"use client";

import { useState } from "react";
import { ChevronDown, BarChart3 } from "lucide-react";

export function AnalyticsCollapsible({
  children,
  headerRight,
}: {
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Title row: toggles open/closed. Chevron sits inline on mobile. */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex items-center justify-between gap-2 w-full text-left hover:opacity-80 transition-opacity sm:w-auto sm:justify-start"
        >
          <span className="flex items-center gap-2 min-w-0">
            <BarChart3 className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold truncate">
              Analytics & Statistics
            </span>
          </span>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform shrink-0 sm:hidden ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        <div className="flex items-center gap-3 sm:shrink-0">
          {headerRight}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Collapse analytics" : "Expand analytics"}
            className="shrink-0 hidden sm:block"
          >
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>
      {open && <div className="space-y-4">{children}</div>}
    </div>
  );
}
