import Link from "next/link";
import { requireAuth } from "@/lib/auth-helpers";
import {
  listHandovers,
  getHandoverStats,
  getDashboardAnalytics,
  getDashboardMonthOptions,
  getRecentPhotos,
} from "@/lib/actions/handovers";
import { getAnalyticsWidgetSettings } from "@/lib/actions/app-settings";
import { DashboardMonthFilter } from "@/components/dashboard-month-filter";
import { PhotoSlideshow } from "@/components/photo-slideshow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HandoversOverTimeChart,
  TopMakesChart,
} from "@/components/dashboard-charts";
import { AnalyticsCollapsible } from "@/components/analytics-collapsible";
import { CollapsibleCard } from "@/components/collapsible-card";
import {
  ClipboardPlus,
  FileText,
  FilePen,
  CheckCircle,
  Car,
  ClipboardCheck,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CircleDot,
  Camera,
  AlertTriangle,
  User,
} from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAuth();
  const { month } = await searchParams;
  const [handovers, stats, analytics, visibleWidgetIds, monthOptions, recentPhotos] =
    await Promise.all([
      listHandovers(10),
      getHandoverStats(),
      getDashboardAnalytics(month),
      getAnalyticsWidgetSettings(),
      getDashboardMonthOptions(),
      getRecentPhotos(20),
    ]);
  const visible = new Set(visibleWidgetIds);

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

      {/* Row 1: existing core stats */}
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

      <AnalyticsCollapsible
        headerRight={
          <DashboardMonthFilter
            months={monthOptions}
            selected={analytics.selectedMonth}
          />
        }
      >
        {/* Stat cards: type split, this month, quality metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.has("collections") && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Collections
                </CardTitle>
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.collections}</div>
              </CardContent>
            </Card>
          )}

          {visible.has("dynamic") && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Custom Forms
                </CardTitle>
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.dynamic}</div>
              </CardContent>
            </Card>
          )}

          {visible.has("thisMonth") && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {analytics.thisMonthLabel}
                </CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{analytics.thisMonth}</span>
                  {analytics.monthTrend === null ? (
                    analytics.thisMonth > 0 && (
                      <span className="flex items-center text-xs font-medium text-success">
                        <TrendingUp className="h-3 w-3 mr-0.5" />
                        new
                      </span>
                    )
                  ) : (
                    analytics.monthTrend !== 0 && (
                      <span
                        className={`flex items-center text-xs font-medium ${
                          analytics.monthTrend > 0
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {analytics.monthTrend > 0 ? (
                          <TrendingUp className="h-3 w-3 mr-0.5" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-0.5" />
                        )}
                        {analytics.monthTrend > 0 ? "+" : ""}
                        {analytics.monthTrend}% vs prev month
                      </span>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {visible.has("passRate") && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Pass Rate
                </CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analytics.passPercentage}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across completed inspections
                </p>
              </CardContent>
            </Card>
          )}

          {visible.has("runFlat") && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Run Flat Tyres
                </CardTitle>
                <CircleDot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analytics.runFlatPercentage}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.totalTyres} tyres recorded
                </p>
              </CardContent>
            </Card>
          )}

          {visible.has("photos") && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Photos Captured
                </CardTitle>
                <Camera className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.totalPhotos}</div>
                {analytics.damagePhotos > 0 && (
                  <p className="text-xs text-destructive mt-1">
                    {analytics.damagePhotos} damage photo
                    {analytics.damagePhotos !== 1 ? "s" : ""}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visible.has("overTimeChart") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Handovers Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <HandoversOverTimeChart data={analytics.monthly} />
              </CardContent>
            </Card>
          )}

          {visible.has("topMakes") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Vehicle Makes</CardTitle>
              </CardHeader>
              <CardContent>
                <TopMakesChart data={analytics.topMakes} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Failed checks + inspector row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visible.has("failedChecks") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Most Failed Checks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.failedChecks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No completed inspections yet
                </p>
              ) : (
                <div className="space-y-2">
                  {analytics.failedChecks.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">
                          {i + 1}.
                        </span>
                        <span className="text-sm truncate">{item.item}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {item.fails}/{item.total}
                        </span>
                        <Badge
                          variant={
                            item.percentage >= 50 ? "destructive" : "outline"
                          }
                          className="text-[10px] min-w-[40px] justify-center"
                        >
                          {item.percentage}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {visible.has("inspectors") && analytics.isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Handovers per Inspector
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.inspectors.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No data yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {analytics.inspectors.map((inspector, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">
                            {i + 1}.
                          </span>
                          <span className="text-sm font-medium">
                            {inspector.name}
                          </span>
                        </div>
                        <Badge variant="secondary">{inspector.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </AnalyticsCollapsible>

      {/* Recent Handovers */}
      <CollapsibleCard title="Recent Handovers" defaultOpen={false}>
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
                        {h.vehicleMake} {h.vehicleModel}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {h.vehicleRegistration} &middot;{" "}
                        {new Date(h.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className="text-[10px]">
                      {h.type === "collection"
                        ? "Collection"
                        : h.type === "dynamic"
                          ? h.formTemplateName || h.archivedTemplateName || "Deleted Form"
                          : "Delivery"}
                    </Badge>
                    <Badge
                      variant={h.status === "completed" ? "success" : "warning"}
                    >
                      {h.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
      </CollapsibleCard>

      {/* Photo slideshow (desktop only) */}
      {recentPhotos.length > 0 && (
        <div className="hidden lg:block">
          <PhotoSlideshow photos={recentPhotos} />
        </div>
      )}
    </div>
  );
}
