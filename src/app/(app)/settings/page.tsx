import { requireAdmin } from "@/lib/auth-helpers";
import { listUsers } from "@/lib/actions/users";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  await requireAdmin();
  const users = await listUsers();

  return <SettingsClient initialUsers={users} />;
}
