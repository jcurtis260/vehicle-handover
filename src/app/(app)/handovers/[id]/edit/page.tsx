import { requireAuth } from "@/lib/auth-helpers";
import { getHandover } from "@/lib/actions/handovers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { HandoverForm } from "@/components/handover-form";
import { DeliveryForm } from "@/components/delivery-form";
import { notFound, redirect } from "next/navigation";
import { CHECK_ITEMS } from "@/lib/check-items";
import { DELIVERY_CHECK_ITEMS } from "@/lib/check-items";

export default async function EditHandoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const session = await getServerSession(authOptions);
  const { id } = await params;
  const handover = await getHandover(id);
  if (!handover) notFound();

  const isAdmin = session?.user?.role === "admin";
  const canEdit = isAdmin || session?.user?.canEdit === true;

  if (handover.status === "completed" && !canEdit) {
    redirect(`/handovers/${id}`);
  }

  const isDelivery = handover.type === "delivery";

  if (isDelivery) {
    const allDeliveryKeys = [...CHECK_ITEMS, ...DELIVERY_CHECK_ITEMS];
    const checksMap: Record<string, { checked: boolean; comments: string }> = {};
    for (const key of allDeliveryKeys) {
      const found = handover.checks.find((c) => c.checkItem === key);
      checksMap[key] = {
        checked: found?.checked || false,
        comments: found?.comments || "",
      };
    }

    const v5Photos = handover.photos
      .filter((p) => p.category === "v5")
      .map((p) => ({
        id: p.id,
        url: p.blobUrl,
        category: p.category,
        caption: p.caption || "",
      }));

    const signaturePhoto = handover.photos.find((p) => p.category === "signature");

    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">Edit Delivery</h1>
        <DeliveryForm
          mode="edit"
          handoverId={handover.id}
          initialData={{
            make: handover.vehicle.make,
            model: handover.vehicle.model,
            registration: handover.vehicle.registration,
            date: new Date(handover.date).toISOString().split("T")[0],
            name: handover.name,
            mileage: handover.mileage,
            otherComments: handover.otherComments || "",
            checks: checksMap,
            photos: v5Photos,
            signatureUrl: signaturePhoto?.blobUrl || null,
            signatoryName: signaturePhoto?.caption || "",
          }}
        />
      </div>
    );
  }

  // Collection form
  const checksMap: Record<string, { checked: boolean; comments: string }> = {};
  for (const key of CHECK_ITEMS) {
    const found = handover.checks.find((c) => c.checkItem === key);
    checksMap[key] = {
      checked: found?.checked || false,
      comments: found?.comments || "",
    };
  }

  const tyresMap: Record<string, { size: string; depth: string; brand: string; tyreType: string }> = {};
  for (const t of handover.tyres) {
    tyresMap[t.position] = {
      size: t.size || "",
      depth: t.depth || "",
      brand: t.brand || "",
      tyreType: t.tyreType || "normal",
    };
  }
  for (const pos of ["NSF", "NSR", "OSR", "OSF"]) {
    if (!tyresMap[pos]) tyresMap[pos] = { size: "", depth: "", brand: "", tyreType: "normal" };
  }

  const photos = handover.photos.map((p) => ({
    id: p.id,
    url: p.blobUrl,
    category: p.category,
    caption: p.caption || "",
  }));

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Edit Handover</h1>
      <HandoverForm
        mode="edit"
        handoverId={handover.id}
        initialData={{
          make: handover.vehicle.make,
          model: handover.vehicle.model,
          registration: handover.vehicle.registration,
          date: new Date(handover.date).toISOString().split("T")[0],
          name: handover.name,
          mileage: handover.mileage,
          otherComments: handover.otherComments || "",
          checks: checksMap,
          tyres: tyresMap,
          photos,
        }}
      />
    </div>
  );
}
