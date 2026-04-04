export const FUEL_TYPE_VALUES = [
  "petrol",
  "diesel",
  "petrol_hybrid",
  "diesel_hybrid",
] as const;

export type FuelTypeValue = (typeof FUEL_TYPE_VALUES)[number];

export const FUEL_TYPE_LABELS: Record<FuelTypeValue, string> = {
  petrol: "Petrol",
  diesel: "Diesel",
  petrol_hybrid: "Petrol Hybrid",
  diesel_hybrid: "Diesel Hybrid",
};

export const COLLECTION_OUTCOME_VALUES = ["accepted", "rejected"] as const;
export type CollectionOutcomeValue = (typeof COLLECTION_OUTCOME_VALUES)[number];

export const COLLECTION_OUTCOME_LABELS: Record<CollectionOutcomeValue, string> = {
  accepted: "Accepted",
  rejected: "Rejected",
};

export function fuelTypeLabel(value: string | null | undefined): string {
  if (!value) return "N/A";
  return FUEL_TYPE_LABELS[value as FuelTypeValue] ?? value;
}

export function collectionOutcomeLabel(value: string | null | undefined): string {
  if (!value) return "N/A";
  return COLLECTION_OUTCOME_LABELS[value as CollectionOutcomeValue] ?? value;
}
