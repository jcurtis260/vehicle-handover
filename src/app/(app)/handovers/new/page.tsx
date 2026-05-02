import { requireAuth } from "@/lib/auth-helpers";
import { HandoverForm } from "@/components/handover-form";
import { DynamicHandoverForm } from "@/components/dynamic-handover-form";
import {
  getFormTemplateDetails,
  listActiveFormTemplates,
} from "@/lib/actions/form-templates";
import { TypeSelector } from "./type-selector";
import { notFound } from "next/navigation";

export default async function NewHandoverPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; templateId?: string }>;
}) {
  await requireAuth();
  const { type, templateId } = await searchParams;
  const dynamicTemplates = await listActiveFormTemplates();

  if (type === "collection") {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">New Collection</h1>
        <HandoverForm mode="create" />
      </div>
    );
  }

  if (type === "dynamic") {
    if (!templateId) return <TypeSelector dynamicTemplates={dynamicTemplates} />;
    const template = await getFormTemplateDetails(templateId);
    if (!template) notFound();
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">
          New {template.name} (V{template.version})
        </h1>
        <DynamicHandoverForm mode="create" template={template} />
      </div>
    );
  }

  return <TypeSelector dynamicTemplates={dynamicTemplates} />;
}
