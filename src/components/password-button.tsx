"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";

export function PasswordButton() {
  return (
    <Link
      href="/password"
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-accent transition-colors"
      title="Change password"
    >
      <KeyRound className="h-4 w-4" />
    </Link>
  );
}
