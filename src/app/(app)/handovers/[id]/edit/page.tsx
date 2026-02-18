import { requireAuth } from "@/lib/auth-helpers";
import { getHandover } from "@/lib/actions/handovers";
import { HandoverForm } from "@/components/handover-form";
import { notFound } from "next/navigation";
import { CHECK_ITEMS } from "@/lib/check-items";

export default async function EditHandoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const handover = await getHandover(id);
  if (!handover) notFound();

  const checksMap: Record<string, { checked: boolean; comments: string }> = {};
  for (const key of CHECK_ITEMS) {
    const found = handover.checks.find((c) => c.checkItem === key);
    checksMap[key] = {
      checked: found?.checked || false,
      comments: found?.comments || "",
    };
  }

  const tyresMap: Record<string, { size: string; depth: string; brand: string }> = {};
  for (const t of handover.tyres) {
    tyresMap[t.position] = {
      size: t.size || "",
      depth: t.depth || "",
      brand: t.brand || "",
    };
  }
  for (const pos of ["NSF", "NSR", "OSR", "OSF"]) {
    if (!tyresMap[pos]) tyresMap[pos] = { size: "", depth: "", brand: "" };
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
