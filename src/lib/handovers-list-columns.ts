export const HANDOVER_LIST_COLUMN_IDS = [
  "make",
  "model",
  "registration",
  "date",
  "inspector",
  "type",
  "status",
  "photos",
  "mileage",
  "fuelType",
  "collectionOutcome",
] as const;

export type HandoverListColumnId = (typeof HANDOVER_LIST_COLUMN_IDS)[number];

const LABELS: Record<HandoverListColumnId, string> = {
  make: "Make",
  model: "Model",
  registration: "Registration",
  date: "Date",
  inspector: "Inspector",
  type: "Type",
  status: "Status",
  photos: "Photos",
  mileage: "Mileage",
  fuelType: "Fuel type",
  collectionOutcome: "Collection status",
};

export function handoverListColumnLabel(id: HandoverListColumnId): string {
  return LABELS[id];
}

export const HANDOVER_LIST_SORTABLE = new Set<
  | "date"
  | "make"
  | "registration"
  | "status"
  | "type"
  | "fuelType"
  | "collectionOutcome"
>(["date", "make", "registration", "status", "type", "fuelType", "collectionOutcome"]);

export function defaultVisibleHandoverListColumns(): HandoverListColumnId[] {
  return [...HANDOVER_LIST_COLUMN_IDS];
}

const ALLOWED = new Set<string>(HANDOVER_LIST_COLUMN_IDS);

export function mergeHandoverListColumnPrefs(
  input: string[] | undefined | null
): HandoverListColumnId[] {
  const picked = new Set<string>();
  if (input && input.length > 0) {
    for (const id of input) {
      if (ALLOWED.has(id)) picked.add(id);
    }
  }
  if (picked.size === 0) return defaultVisibleHandoverListColumns();
  return HANDOVER_LIST_COLUMN_IDS.filter((id) => picked.has(id));
}
