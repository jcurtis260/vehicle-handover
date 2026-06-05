"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CalendarDays, Loader2 } from "lucide-react";

function formatMonthOption(ym: string) {
  const [year, month] = ym.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function DashboardMonthFilter({
  months,
  selected,
}: {
  months: string[];
  selected: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(() => {
      router.push(`/dashboard?month=${value}`);
    });
  }

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        aria-label="Filter analytics by month"
        className="h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground disabled:opacity-60 sm:w-auto sm:min-w-[160px]"
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {formatMonthOption(m)}
          </option>
        ))}
      </select>
      {isPending && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
      )}
    </div>
  );
}
