"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CollapsibleCard({
  title,
  defaultOpen = true,
  children,
}: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity"
        >
          <CardTitle className="text-lg">{title}</CardTitle>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform ${
              open ? "" : "-rotate-90"
            }`}
          />
        </button>
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}
