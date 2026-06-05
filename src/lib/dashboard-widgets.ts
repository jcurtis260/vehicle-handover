export const DASHBOARD_WIDGET_IDS = [
  "collections",
  "dynamic",
  "thisMonth",
  "passRate",
  "runFlat",
  "photos",
  "overTimeChart",
  "topMakes",
  "failedChecks",
  "inspectors",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  collections: "Collections",
  dynamic: "Custom Forms",
  thisMonth: "This Month",
  passRate: "Avg Pass Rate",
  runFlat: "Run Flat Tyres",
  photos: "Photos Captured",
  overTimeChart: "Handovers Over Time chart",
  topMakes: "Top Vehicle Makes chart",
  failedChecks: "Most Failed Checks",
  inspectors: "Handovers per Inspector (admin only)",
};

export function dashboardWidgetLabel(id: DashboardWidgetId): string {
  return DASHBOARD_WIDGET_LABELS[id];
}

export function defaultVisibleDashboardWidgets(): DashboardWidgetId[] {
  return [...DASHBOARD_WIDGET_IDS];
}

const ALLOWED = new Set<string>(DASHBOARD_WIDGET_IDS);

export function mergeDashboardWidgetPrefs(
  input: string[] | undefined | null
): DashboardWidgetId[] {
  // A null/undefined config means "never customized" -> show everything.
  if (input === undefined || input === null) {
    return defaultVisibleDashboardWidgets();
  }
  const picked = new Set<string>();
  for (const id of input) {
    if (ALLOWED.has(id)) picked.add(id);
  }
  // An explicit empty selection is honored (admin hid everything).
  return DASHBOARD_WIDGET_IDS.filter((id) => picked.has(id));
}
