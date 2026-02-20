"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  listFilteredHandovers,
  type HandoverFilters,
} from "@/lib/actions/handovers";
import {
  Search,
  Car,
  Loader2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  ArrowUpDown,
} from "lucide-react";

type FilterOptions = {
  makes: string[];
  models: string[];
  inspectors: { id: string; name: string }[];
  isAdmin: boolean;
};

type ResultRow = Awaited<
  ReturnType<typeof listFilteredHandovers>
>["data"][number];

interface Props {
  filterOptions: FilterOptions;
}

const PAGE_SIZE = 20;

export function HandoversList({ filterOptions }: Props) {
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const [filters, setFilters] = useState<HandoverFilters>({
    sortBy: "date",
    sortDir: "desc",
  });

  const fetchData = useCallback(
    (f: HandoverFilters, p: number) => {
      startTransition(async () => {
        const result = await listFilteredHandovers(f, p, PAGE_SIZE);
        setResults(result.data);
        setTotal(result.total);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setLoaded(true);
      });
    },
    [startTransition]
  );

  useEffect(() => {
    fetchData(filters, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters() {
    setPage(1);
    fetchData(filters, 1);
  }

  function clearFilters() {
    const cleared: HandoverFilters = { sortBy: "date", sortDir: "desc" };
    setFilters(cleared);
    setPage(1);
    fetchData(cleared, 1);
  }

  function goToPage(p: number) {
    fetchData(filters, p);
  }

  function toggleSort(col: HandoverFilters["sortBy"]) {
    const newDir =
      filters.sortBy === col && filters.sortDir === "desc" ? "asc" : "desc";
    const updated = { ...filters, sortBy: col, sortDir: newDir as "asc" | "desc" };
    setFilters(updated);
    fetchData(updated, 1);
  }

  const hasActiveFilters =
    filters.search ||
    filters.make ||
    filters.model ||
    filters.status ||
    filters.type ||
    filters.inspectorId ||
    filters.dateFrom ||
    filters.dateTo;

  function SortIcon({ col }: { col: HandoverFilters["sortBy"] }) {
    if (filters.sortBy !== col) {
      return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    }
    return (
      <ArrowUpDown
        className={`h-3 w-3 ${filters.sortDir === "asc" ? "rotate-180" : ""}`}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">All Handovers</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFiltersOpen((v) => !v)}
          className="lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4 mr-1.5" />
          Filters
        </Button>
      </div>

      {/* Filters */}
      <Card
        className={`${filtersOpen ? "block" : "hidden lg:block"}`}
      >
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={filters.search || ""}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, search: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  placeholder="Registration, make, model..."
                  className="pl-9"
                />
              </div>
            </div>

            {/* Make */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Make
              </label>
              <select
                value={filters.make || ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, make: e.target.value || undefined }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All Makes</option>
                {filterOptions.makes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Model
              </label>
              <select
                value={filters.model || ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    model: e.target.value || undefined,
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All Models</option>
                {filterOptions.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Status
              </label>
              <select
                value={filters.status || ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    status: (e.target.value || undefined) as
                      | "draft"
                      | "completed"
                      | undefined,
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Type
              </label>
              <select
                value={filters.type || ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    type: (e.target.value || undefined) as
                      | "collection"
                      | "delivery"
                      | undefined,
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All Types</option>
                <option value="collection">Collection</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>

            {/* Inspector (admin only) */}
            {filterOptions.isAdmin && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Inspector
                </label>
                <select
                  value={filters.inspectorId || ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      inspectorId: e.target.value || undefined,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">All Inspectors</option>
                  {filterOptions.inspectors.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date From */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Date From
              </label>
              <Input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    dateFrom: e.target.value || undefined,
                  }))
                }
              />
            </div>

            {/* Date To */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Date To
              </label>
              <Input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    dateTo: e.target.value || undefined,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button onClick={applyFilters} disabled={isPending} size="sm">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Search className="h-4 w-4 mr-1.5" />
              )}
              Apply Filters
            </Button>
            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="outline"
                size="sm"
                disabled={isPending}
              >
                <X className="h-4 w-4 mr-1.5" />
                Clear
              </Button>
            )}
            {loaded && (
              <span className="text-sm text-muted-foreground ml-auto">
                {total} result{total !== 1 && "s"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isPending && !loaded && (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {loaded && results.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Car className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No handovers found</p>
          <p className="text-sm mt-1">
            {hasActiveFilters
              ? "Try adjusting your filters."
              : "No handover records exist yet."}
          </p>
        </div>
      )}

      {/* Desktop table */}
      {results.length > 0 && (
        <>
          <div className="hidden md:block">
            <div
              className={`border border-border rounded-xl overflow-hidden ${isPending ? "opacity-60 pointer-events-none" : ""}`}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium">
                      <button
                        onClick={() => toggleSort("make")}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Vehicle <SortIcon col="make" />
                      </button>
                    </th>
                    <th className="text-left p-3 font-medium">
                      <button
                        onClick={() => toggleSort("registration")}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Registration <SortIcon col="registration" />
                      </button>
                    </th>
                    <th className="text-left p-3 font-medium">
                      <button
                        onClick={() => toggleSort("date")}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Date <SortIcon col="date" />
                      </button>
                    </th>
                    <th className="text-left p-3 font-medium">Inspector</th>
                    <th className="text-left p-3 font-medium">
                      <button
                        onClick={() => toggleSort("type")}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Type <SortIcon col="type" />
                      </button>
                    </th>
                    <th className="text-left p-3 font-medium">
                      <button
                        onClick={() => toggleSort("status")}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Status <SortIcon col="status" />
                      </button>
                    </th>
                    <th className="text-left p-3 font-medium">Mileage</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                    >
                      <td className="p-3">
                        <Link
                          href={`/handovers/${r.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {r.vehicleMake} {r.vehicleModel}
                        </Link>
                      </td>
                      <td className="p-3 font-mono">
                        {r.vehicleRegistration}
                      </td>
                      <td className="p-3">
                        {new Date(r.date).toLocaleDateString()}
                      </td>
                      <td className="p-3">{r.name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          {r.type === "delivery" ? "Delivery" : "Collection"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            r.status === "completed" ? "success" : "warning"
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {r.mileage?.toLocaleString() ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div
            className={`md:hidden space-y-2 ${isPending ? "opacity-60 pointer-events-none" : ""}`}
          >
            {results.map((r) => (
              <Link key={r.id} href={`/handovers/${r.id}`}>
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {r.vehicleMake} {r.vehicleModel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {r.type === "delivery" ? "Delivery" : "Collection"}
                        </Badge>
                        <Badge
                          variant={
                            r.status === "completed" ? "success" : "warning"
                          }
                        >
                          {r.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {r.vehicleRegistration} &middot;{" "}
                      {new Date(r.date).toLocaleDateString()} &middot; {r.name}
                    </p>
                    {r.mileage && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.mileage.toLocaleString()} miles
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isPending}
                  onClick={() => goToPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {generatePageNumbers(page, totalPages).map((p, i) =>
                  p === "..." ? (
                    <span
                      key={`ellipsis-${i}`}
                      className="px-2 text-sm text-muted-foreground"
                    >
                      ...
                    </span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      disabled={isPending}
                      onClick={() => goToPage(p as number)}
                      className="min-w-[36px]"
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || isPending}
                  onClick={() => goToPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function generatePageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("...");

  pages.push(total);
  return pages;
}
