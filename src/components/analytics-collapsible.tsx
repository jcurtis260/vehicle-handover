"use client";

import { useState } from "react";
import { ChevronDown, BarChart3 } from "lucide-react";

export function AnalyticsCollapsible({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-semibold">Analytics & Statistics</span>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && <div className="space-y-4">{children}</div>}
    </div>
  );
}
