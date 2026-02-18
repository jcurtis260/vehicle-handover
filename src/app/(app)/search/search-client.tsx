"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { searchHandovers } from "@/lib/actions/handovers";
import { Search as SearchIcon, Car, Loader2 } from "lucide-react";

type SearchResult = Awaited<ReturnType<typeof searchHandovers>>[number];

export function SearchClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    startTransition(async () => {
      const data = await searchHandovers(query.trim());
      setResults(data);
      setSearched(true);
    });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Search Handovers</h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by make, model, or registration..."
          className="flex-1"
        />
        <Button type="submit" disabled={isPending} className="min-h-[44px]">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SearchIcon className="h-4 w-4" />
          )}
          <span className="ml-2 hidden sm:inline">Search</span>
        </Button>
      </form>

      {searched && results.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <SearchIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No results found for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {/* Mobile: cards. Desktop: table */}
      {results.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium">Vehicle</th>
                    <th className="text-left p-3 font-medium">Registration</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Inspector</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                      <td className="p-3">
                        <Link
                          href={`/handovers/${r.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {r.vehicleMake} {r.vehicleModel}
                        </Link>
                      </td>
                      <td className="p-3 font-mono">{r.vehicleRegistration}</td>
                      <td className="p-3">
                        {new Date(r.date).toLocaleDateString()}
                      </td>
                      <td className="p-3">{r.name}</td>
                      <td className="p-3">
                        <Badge
                          variant={r.status === "completed" ? "success" : "warning"}
                        >
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
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
                      <Badge
                        variant={
                          r.status === "completed" ? "success" : "warning"
                        }
                      >
                        {r.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {r.vehicleRegistration} &middot;{" "}
                      {new Date(r.date).toLocaleDateString()} &middot; {r.name}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
