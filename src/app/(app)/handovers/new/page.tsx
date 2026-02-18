import { requireAuth } from "@/lib/auth-helpers";
import { HandoverForm } from "@/components/handover-form";

export default async function NewHandoverPage() {
  await requireAuth();

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">New Handover</h1>
      <HandoverForm mode="create" />
    </div>
  );
}
