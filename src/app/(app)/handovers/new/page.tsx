import { requireAuth } from "@/lib/auth-helpers";
import { HandoverForm } from "@/components/handover-form";
import { DeliveryForm } from "@/components/delivery-form";
import { TypeSelector } from "./type-selector";

export default async function NewHandoverPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireAuth();
  const { type } = await searchParams;

  if (type === "collection") {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">New Collection</h1>
        <HandoverForm mode="create" />
      </div>
    );
  }

  if (type === "delivery") {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">New Delivery</h1>
        <DeliveryForm mode="create" />
      </div>
    );
  }

  return <TypeSelector />;
}
