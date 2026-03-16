import { requireAdmin } from "@/lib/auth-helpers";
import { listUsers } from "@/lib/actions/users";
import { getVehicleCatalog } from "@/lib/actions/vehicle-catalog";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  await requireAdmin();
  const [users, vehicleCatalog] = await Promise.all([
    listUsers(),
    getVehicleCatalog(),
  ]);

  return <SettingsClient initialUsers={users} initialVehicleCatalog={vehicleCatalog} />;
}
