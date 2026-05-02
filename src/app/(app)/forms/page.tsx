import { requireAdmin } from "@/lib/auth-helpers";
import { listFormTemplates } from "@/lib/actions/form-templates";
import { FormBuilderClient } from "./form-builder-client";

export default async function FormsPage() {
  await requireAdmin();
  const templates = await listFormTemplates();

  return <FormBuilderClient initialTemplates={templates} />;
}
