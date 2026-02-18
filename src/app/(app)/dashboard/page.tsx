import Link from "next/link";
import { requireAuth } from "@/lib/auth-helpers";
import { listHandovers, getHandoverStats } from "@/lib/actions/handovers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardPlus,
  FileText,
  FilePen,
  CheckCircle,
  Car,
} from "lucide-react";

export default async function DashboardPage() {
  await requireAuth();
  const [handovers, stats] = await Promise.all([
    listHandovers(10),
    getHandoverStats(),
  ]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/handovers/new">
          <Button className="min-h-[44px]">
            <ClipboardPlus className="h-4 w-4 mr-2" />
            New Handover
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Handovers
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Drafts
            </CardTitle>
            <FilePen className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.drafts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Handovers</CardTitle>
        </CardHeader>
        <CardContent>
          {handovers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No handovers yet</p>
              <p className="text-sm mt-1">
                Create your first handover to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {handovers.map((h) => (
                <Link
                  key={h.id}
                  href={`/handovers/${h.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Car className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {h.vehicle.make} {h.vehicle.model}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {h.vehicle.registration} &middot;{" "}
                        {new Date(h.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={h.status === "completed" ? "success" : "warning"}
                  >
                    {h.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
