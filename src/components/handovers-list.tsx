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
import { saveHandoverListColumnPreferences } from "@/lib/actions/user-preferences";
import {
  HANDOVER_LIST_COLUMN_IDS,
  handoverListColumnLabel,
  defaultVisibleHandoverListColumns,
  type HandoverListColumnId,
} from "@/lib/handovers-list-columns";
import { fuelTypeLabel, collectionOutcomeLabel } from "@/lib/fuel-types";
import {
  Search,
  Car,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Columns3,
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
  initialVisibleColumns: HandoverListColumnId[];
}

const PAGE_SIZE = 20;

const SORTABLE_SORT_KEYS = new Set<string>([
  "date",
  "make",
  "registration",
  "status",
  "type",
  "fuelType",
  "collectionOutcome",
]);

function sortKeyFromColumnId(
  col: HandoverListColumnId
): HandoverFilters["sortBy"] | null {
  if (SORTABLE_SORT_KEYS.has(col)) {
    return col as NonNullable<HandoverFilters["sortBy"]>;
  }
  return null;
}

function HandoverDataCell({
  col,
  row,
  modelAsLink,
}: {
  col: HandoverListColumnId;
  row: ResultRow;
  modelAsLink: boolean;
}) {
  switch (col) {
    case "make":
      return (
        <span className="max-w-[160px] truncate block" title={row.vehicleMake}>
          {row.vehicleMake}
        </span>
      );
    case "model":
      if (modelAsLink) {
        return (
          <Link
            href={`/handovers/${row.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.vehicleModel}
          </Link>
        );
      }
      return <span className="font-medium">{row.vehicleModel}</span>;
    case "registration":
      return (
        <span className="font-mono" title={row.vehicleRegistration}>
          {row.vehicleRegistration}
        </span>
      );
    case "date":
      return <>{new Date(row.date).toLocaleDateString()}</>;
    case "inspector":
      return (
        <span className="max-w-[120px] truncate block" title={row.name}>
          {row.name}
        </span>
      );
    case "type":
      return (
        <Badge variant="outline" className="text-[10px]">
          {row.type === "delivery" ? "Delivery" : "Collection"}
        </Badge>
      );
    case "status":
      return (
        <Badge
          variant={row.status === "completed" ? "success" : "warning"}
        >
          {row.status}
        </Badge>
      );
    case "photos":
      return row.hasPhotos ? (
        <Check className="h-4 w-4 text-success" />
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    case "mileage":
      return (
        <span className="text-muted-foreground">
          {row.mileage?.toLocaleString() ?? "-"}
        </span>
      );
    case "fuelType":
      return (
        <span className="text-muted-foreground">
          {fuelTypeLabel(row.fuelType)}
        </span>
      );
    case "collectionOutcome": {
      const o = row.collectionOutcome;
      if (o === "accepted") {
        return (
          <Badge variant="success">{collectionOutcomeLabel(o).toLowerCase()}</Badge>
        );
      }
      if (o === "rejected") {
        return (
          <Badge variant="destructive">
            {collectionOutcomeLabel(o).toLowerCase()}
          </Badge>
        );
      }
      return (
        <span className="text-muted-foreground">
          {collectionOutcomeLabel(o)}
        </span>
      );
    }
    default:
      return null;
  }
}

export function HandoversList({
  filterOptions,
  initialVisibleColumns,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] =
    useState<HandoverListColumnId[]>(initialVisibleColumns);
  const [draftColumns, setDraftColumns] = useState<Set<HandoverListColumnId>>(
    () => new Set(initialVisibleColumns)
  );
  const [savingColumns, setSavingColumns] = useState(false);

  const [filters, setFilters] = useState<HandoverFilters>({
    sortBy: "date",
    sortDir: "desc",
  });

  useEffect(() => {
    setVisibleColumns(initialVisibleColumns);
    setDraftColumns(new Set(initialVisibleColumns));
  }, [initialVisibleColumns]);

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
    const updated = {
      ...filters,
      sortBy: col,
      sortDir: newDir as "asc" | "desc",
    };
    setFilters(updated);
    fetchData(updated, 1);
  }

  function openColumnsPanel() {
    setDraftColumns(new Set(visibleColumns));
    setColumnsOpen(true);
  }

  async function saveColumnPreferences() {
    const ordered = HANDOVER_LIST_COLUMN_IDS.filter((id) => draftColumns.has(id));
    if (ordered.length === 0) {
      alert("Select at least one column.");
      return;
    }
    setSavingColumns(true);
    try {
      await saveHandoverListColumnPreferences(ordered);
      setVisibleColumns(ordered);
      setColumnsOpen(false);
    } catch {
      alert("Could not save column preferences.");
    } finally {
      setSavingColumns(false);
    }
  }

  function resetColumnsToDefault() {
    setDraftColumns(new Set(defaultVisibleHandoverListColumns()));
  }

  function toggleDraftColumn(id: HandoverListColumnId) {
    setDraftColumns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">All Handovers</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openColumnsPanel}
            className="min-h-[44px] sm:min-h-9"
          >
            <Columns3 className="h-4 w-4 mr-1.5" />
            Columns
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen((v) => !v)}
            className="lg:hidden min-h-[44px] sm:min-h-9"
          >
            <SlidersHorizontal className="h-4 w-4 mr-1.5" />
            Filters
          </Button>
        </div>
      </div>

      {columnsOpen && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold">Visible columns</label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="sm:hidden min-h-[44px] min-w-[44px]"
                onClick={() => setColumnsOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose which columns appear in the table and on mobile. At least
              one column must stay on.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HANDOVER_LIST_COLUMN_IDS.map((id) => (
                <label
                  key={id}
                  className="flex items-center gap-3 min-h-[44px] min-w-0 cursor-pointer rounded-md border border-border px-3 py-2"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border accent-primary shrink-0"
                    checked={draftColumns.has(id)}
                    onChange={() => toggleDraftColumn(id)}
                  />
                  <span className="text-sm">{handoverListColumnLabel(id)}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                onClick={saveColumnPreferences}
                disabled={savingColumns || draftColumns.size === 0}
                className="min-h-[44px] sm:min-h-9"
              >
                {savingColumns ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save columns
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetColumnsToDefault}
                disabled={savingColumns}
                className="min-h-[44px] sm:min-h-9"
              >
                Reset to default
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="hidden sm:inline-flex"
                onClick={() => setColumnsOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[960px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {visibleColumns.map((col) => {
                        const sk = sortKeyFromColumnId(col);
                        return (
                          <th
                            key={col}
                            className="text-left p-3 font-medium whitespace-nowrap"
                          >
                            {sk ? (
                              <button
                                type="button"
                                onClick={() => toggleSort(sk)}
                                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                              >
                                {handoverListColumnLabel(col)}{" "}
                                <SortIcon col={sk} />
                              </button>
                            ) : (
                              handoverListColumnLabel(col)
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                      >
                        {visibleColumns.map((col) => (
                          <td key={col} className="p-3 align-top">
                            <HandoverDataCell
                              col={col}
                              row={r}
                              modelAsLink
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Mobile cards */}
          <div
            className={`md:hidden space-y-2 ${isPending ? "opacity-60 pointer-events-none" : ""}`}
          >
            {results.map((r) => (
              <Link key={r.id} href={`/handovers/${r.id}`}>
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start gap-2 mb-1">
                      <Car className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Handover
                      </span>
                    </div>
                    {visibleColumns.map((col) => (
                      <div
                        key={col}
                        className="flex gap-2 text-sm min-w-0 items-start"
                      >
                        <span className="text-muted-foreground shrink-0 w-[118px]">
                          {handoverListColumnLabel(col)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <HandoverDataCell
                            col={col}
                            row={r}
                            modelAsLink={false}
                          />
                        </div>
                      </div>
                    ))}
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
