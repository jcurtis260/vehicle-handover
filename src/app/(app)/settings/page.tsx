import { requireAdmin } from "@/lib/auth-helpers";
import { listUsers } from "@/lib/actions/users";
import { getVehicleCatalog } from "@/lib/actions/vehicle-catalog";
import { getAnalyticsWidgetSettings } from "@/lib/actions/app-settings";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  await requireAdmin();
  const [users, vehicleCatalog, analyticsWidgets] = await Promise.all([
    listUsers(),
    getVehicleCatalog(),
    getAnalyticsWidgetSettings(),
  ]);

  return (
    <SettingsClient
      initialUsers={users}
      initialVehicleCatalog={vehicleCatalog}
      initialAnalyticsWidgets={analyticsWidgets}
    />
  );
}
