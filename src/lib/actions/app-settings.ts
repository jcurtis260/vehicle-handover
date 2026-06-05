"use server";

import { db } from "@/lib/db";
import { appSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  defaultVisibleDashboardWidgets,
  mergeDashboardWidgetPrefs,
  type DashboardWidgetId,
} from "@/lib/dashboard-widgets";

const ANALYTICS_WIDGETS_KEY = "analytics_widgets";

type AnalyticsWidgetsValue = {
  visibleWidgets?: string[];
};

/**
 * Returns the app-wide list of visible dashboard analytics widgets.
 * Falls back to "all visible" when the row is missing or the app_settings
 * table has not been created yet, so the dashboard never crashes pre-migration.
 */
export async function getAnalyticsWidgetSettings(): Promise<
  DashboardWidgetId[]
> {
  try {
    const [row] = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, ANALYTICS_WIDGETS_KEY))
      .limit(1);

    if (!row) return defaultVisibleDashboardWidgets();

    const value = row.value as AnalyticsWidgetsValue | null;
    return mergeDashboardWidgetPrefs(value?.visibleWidgets);
  } catch (error) {
    console.error("[AppSettings] getAnalyticsWidgetSettings failed:", error);
    return defaultVisibleDashboardWidgets();
  }
}

export async function saveAnalyticsWidgetSettings(visibleIds: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Forbidden");
  }

  const merged = mergeDashboardWidgetPrefs(visibleIds);
  const value: AnalyticsWidgetsValue = { visibleWidgets: merged };

  try {
    await db
      .insert(appSettings)
      .values({
        key: ANALYTICS_WIDGETS_KEY,
        value,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedAt: new Date() },
      });
  } catch (error) {
    console.error("[AppSettings] saveAnalyticsWidgetSettings failed:", error);
    return {
      ok: false as const,
      error:
        "Unable to save analytics settings right now. Please try again.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");

  return { ok: true as const, visibleWidgets: merged };
}
