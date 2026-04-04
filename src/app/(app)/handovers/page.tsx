import { requireAuth } from "@/lib/auth-helpers";
import { getHandoverFilterOptions } from "@/lib/actions/handovers";
import { getHandoverListColumnPreferences } from "@/lib/actions/user-preferences";
import { HandoversList } from "@/components/handovers-list";

export default async function HandoversPage() {
  await requireAuth();
  const [filterOptions, initialVisibleColumns] = await Promise.all([
    getHandoverFilterOptions(),
    getHandoverListColumnPreferences(),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <HandoversList
        filterOptions={filterOptions}
        initialVisibleColumns={initialVisibleColumns}
      />
    </div>
  );
}
