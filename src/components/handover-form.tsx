"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhotoCapture } from "@/components/photo-capture";
import { CHECK_ITEMS, CHECK_ITEM_LABELS } from "@/lib/check-items";
import {
  createHandover,
  updateHandover,
} from "@/lib/actions/handovers";
import { getVehicleCatalog } from "@/lib/actions/vehicle-catalog";
import {
  ChevronDown,
  ChevronUp,
  Save,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FUEL_TYPE_VALUES,
  FUEL_TYPE_LABELS,
  type FuelTypeValue,
  type CollectionOutcomeValue,
} from "@/lib/fuel-types";

interface CheckState {
  checked: boolean;
  comments: string;
}

interface TyreState {
  size: string;
  depth: string;
  brand: string;
  tyreType: string;
}

interface PhotoItem {
  id: string;
  url: string;
  category: string;
  caption: string;
}

interface CatalogMake {
  id: string;
  name: string;
  models: Array<{
    id: string;
    makeId: string;
    name: string;
  }>;
}

interface HandoverFormProps {
  mode: "create" | "edit";
  handoverId?: string;
  initialData?: {
    make: string;
    model: string;
    registration: string;
    date: string;
    name: string;
    mileage: number | null;
    otherComments: string;
    fuelType?: string | null;
    collectionOutcome?: string | null;
    collectionRejectionReason?: string | null;
    checks: Record<string, CheckState>;
    tyres: Record<string, TyreState>;
    photos: PhotoItem[];
  };
}

const TYRE_POSITIONS = ["NSF", "NSR", "OSR", "OSF"] as const;

function Section({
  title,
  children,
  defaultOpen = false,
  isOpen,
  onToggle,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isOpen !== undefined ? isOpen : internalOpen;

  function handleToggle() {
    const next = !open;
    if (onToggle) onToggle(next);
    else setInternalOpen(next);
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between p-4 text-left font-semibold bg-card hover:bg-accent/50 transition-colors min-h-[52px]"
      >
        {title}
        {open ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      {open && <div className="p-4 border-t border-border space-y-4">{children}</div>}
    </div>
  );
}

export function HandoverForm({ mode, handoverId, initialData }: HandoverFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);

  const [make, setMake] = useState(initialData?.make || "");
  const [model, setModel] = useState(initialData?.model || "");
  const [customModel, setCustomModel] = useState("");
  const [registration, setRegistration] = useState(initialData?.registration || "");
  const [date, setDate] = useState(
    initialData?.date || new Date().toISOString().split("T")[0]
  );
  const [name, setName] = useState(initialData?.name || session?.user?.name || "");
  const [mileage, setMileage] = useState(
    initialData?.mileage?.toString() || ""
  );
  const [otherComments, setOtherComments] = useState(
    initialData?.otherComments || ""
  );
  const [fuelType, setFuelType] = useState(initialData?.fuelType || "");
  const [collectionOutcome, setCollectionOutcome] = useState<
    CollectionOutcomeValue | null
  >(() => {
    const o = initialData?.collectionOutcome;
    return o === "accepted" || o === "rejected" ? o : null;
  });
  const [collectionRejectionReason, setCollectionRejectionReason] = useState(
    initialData?.collectionRejectionReason || ""
  );

  const [checks, setChecks] = useState<Record<string, CheckState>>(() => {
    if (initialData?.checks) return initialData.checks;
    const init: Record<string, CheckState> = {};
    for (const key of CHECK_ITEMS) {
      init[key] = { checked: false, comments: "" };
    }
    return init;
  });

  const [tyres, setTyres] = useState<Record<string, TyreState>>(() => {
    if (initialData?.tyres) return initialData.tyres;
    const init: Record<string, TyreState> = {};
    for (const pos of TYRE_POSITIONS) {
      init[pos] = { size: "", depth: "", brand: "", tyreType: "normal" };
    }
    return init;
  });
  const [tyreError, setTyreError] = useState("");
  const [tyresOpen, setTyresOpen] = useState(false);
  const tyresSectionRef = useRef<HTMLDivElement>(null);
  const [collectionOutcomeError, setCollectionOutcomeError] = useState(false);
  const [rejectionReasonError, setRejectionReasonError] = useState(false);
  const collectionOutcomeSectionRef = useRef<HTMLDivElement>(null);
  const rejectionReasonRef = useRef<HTMLDivElement>(null);

  const [photos, setPhotos] = useState<PhotoItem[]>(initialData?.photos || []);
  const [catalogMakes, setCatalogMakes] = useState<CatalogMake[]>([]);

  const selectedMake = catalogMakes.find((m) => m.name === make);
  const modelsForSelectedMake = selectedMake?.models ?? [];

  useEffect(() => {
    let alive = true;
    getVehicleCatalog()
      .then((catalog) => {
        if (!alive) return;
        setCatalogMakes(catalog);

        // If editing an old report with a model not in catalog, preserve via "Other".
        if (initialData?.model) {
          const makeMatch = catalog.find((m) => m.name === (initialData.make || ""));
          const hasModel = makeMatch?.models.some((mm) => mm.name === initialData.model);
          if (makeMatch && !hasModel) {
            setModel("__other__");
            setCustomModel(initialData.model);
          }
        }
      })
      .catch((err) => {
        console.error("[VehicleCatalog] Failed to load catalog:", err);
      });
    return () => {
      alive = false;
    };
  }, [initialData?.make, initialData?.model]);

  function updateCheck(key: string, field: keyof CheckState, value: boolean | string) {
    setChecks((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  function updateTyre(pos: string, field: keyof TyreState, value: string) {
    setTyres((prev) => ({
      ...prev,
      [pos]: { ...prev[pos], [field]: value },
    }));
  }

  async function handleSubmit(status: "draft" | "completed") {
    const resolvedModel = model === "__other__" ? customModel.trim() : model;
    if (!make || !resolvedModel || !registration || !name) {
      alert("Please fill in the vehicle details and name.");
      return;
    }

    if (status === "completed") {
      if (!collectionOutcome) {
        setCollectionOutcomeError(true);
        alert("Please select whether the collection was accepted or rejected to complete the handover.");
        setTimeout(() => {
          collectionOutcomeSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
        return;
      }
      if (collectionOutcome === "rejected" && !collectionRejectionReason.trim()) {
        setRejectionReasonError(true);
        alert("Please enter a rejection reason.");
        setTimeout(() => {
          rejectionReasonRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
        return;
      }
    }
    setCollectionOutcomeError(false);
    setRejectionReasonError(false);

    setTyreError("");
    if (status === "completed") {
      const incomplete = TYRE_POSITIONS.filter(
        (pos) => !tyres[pos]?.size || !tyres[pos]?.depth || !tyres[pos]?.brand
      );
      if (incomplete.length > 0) {
        setTyreError(
          `Please complete tyre information for: ${incomplete.join(", ")}`
        );
        setTyresOpen(true);
        setTimeout(() => {
          tyresSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        make,
        model: resolvedModel,
        registration,
        date,
        name,
        mileage: mileage ? parseInt(mileage) : null,
        otherComments,
        fuelType: fuelType.trim() || null,
        collectionOutcome: collectionOutcome ?? null,
        collectionRejectionReason:
          collectionOutcome === "rejected"
            ? collectionRejectionReason.trim() || null
            : null,
        status,
        type: "collection" as const,
        checks: CHECK_ITEMS.map((key) => ({
          checkItem: key,
          checked: checks[key]?.checked || false,
          comments: checks[key]?.comments || "",
        })),
        tyres: TYRE_POSITIONS.map((pos) => ({
          position: pos,
          size: tyres[pos]?.size || "",
          depth: tyres[pos]?.depth || "",
          brand: tyres[pos]?.brand || "",
          tyreType: tyres[pos]?.tyreType || "normal",
        })),
        photos: photos.map((p) => ({
          url: p.url,
          category: p.category,
          caption: p.caption,
        })),
      };

      let result;
      if (mode === "edit" && handoverId) {
        result = await updateHandover(handoverId, payload);
      } else {
        result = await createHandover(payload);
      }

      router.push(`/handovers/${result.id}`);
    } catch (err) {
      alert("Failed to save. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={cn(
        "space-y-4 max-w-4xl mx-auto",
        /* Clear fixed action bar: bottom-16 + nav + bar height (~5rem) + safe area */
        collectionOutcome === "rejected"
          ? "pb-[calc(10rem+env(safe-area-inset-bottom))] sm:pb-[calc(12rem+env(safe-area-inset-bottom))] lg:pb-40"
          : "pb-[calc(8.5rem+env(safe-area-inset-bottom))] lg:pb-32"
      )}
    >
      <Section title="Vehicle Details" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Inspector name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Make</label>
            <select
              value={make}
              onChange={(e) => {
                setMake(e.target.value);
                setModel("");
                setCustomModel("");
              }}
              className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
              required
            >
              <option value="">Select make</option>
              {catalogMakes.map((mk) => (
                <option key={mk.id} value={mk.name}>
                  {mk.name}
                </option>
              ))}
              {make && !catalogMakes.some((mk) => mk.name === make) && (
                <option value={make}>{make}</option>
              )}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
              required
            >
              <option value="">Select model</option>
              {modelsForSelectedMake.map((mm) => (
                <option key={mm.id} value={mm.name}>
                  {mm.name}
                </option>
              ))}
              <option value="__other__">Other...</option>
            </select>
          </div>
          {model === "__other__" && (
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium">Other Model</label>
              <Input
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="Enter model name"
                required
              />
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium">Fuel Type</label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground min-h-[44px]"
            >
              <option value="">Select fuel type</option>
              {FUEL_TYPE_VALUES.map((v) => (
                <option key={v} value={v}>
                  {FUEL_TYPE_LABELS[v as FuelTypeValue]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Registration</label>
            <Input
              value={registration}
              onChange={(e) => setRegistration(e.target.value.toUpperCase())}
              placeholder="e.g. AB12 CDE"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Mileage</label>
            <Input
              type="number"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              placeholder="Odometer reading"
            />
          </div>
        </div>
      </Section>

      <Section title="Vehicle Checks" defaultOpen={false}>
        <div className="space-y-3">
          {CHECK_ITEMS.map((key) => (
            <div
              key={key}
              className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg bg-muted/50"
            >
              <label className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={checks[key]?.checked || false}
                  onChange={(e) =>
                    updateCheck(key, "checked", e.target.checked)
                  }
                  className="h-5 w-5 rounded border-border accent-primary shrink-0"
                />
                <span className="text-sm">{CHECK_ITEM_LABELS[key]}</span>
              </label>
              <Input
                value={checks[key]?.comments || ""}
                onChange={(e) =>
                  updateCheck(key, "comments", e.target.value)
                }
                placeholder="Comments"
                className="sm:max-w-[200px]"
              />
            </div>
          ))}
        </div>
      </Section>

      <div ref={tyresSectionRef}>
      <Section title="Tyre Information *" isOpen={tyresOpen} onToggle={setTyresOpen}>
        {tyreError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {tyreError}
          </div>
        )}
        <div className="space-y-4">
          {TYRE_POSITIONS.map((pos) => {
            const t = tyres[pos];
            const missing = !t?.size || !t?.depth || !t?.brand;
            return (
              <div
                key={pos}
                className={cn(
                  "space-y-2 p-3 rounded-lg",
                  missing ? "bg-warning/5 border border-warning/20" : "bg-muted/50"
                )}
              >
                <h4 className="text-sm font-semibold">{pos}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Size *</label>
                    <Input
                      value={t?.size || ""}
                      onChange={(e) => updateTyre(pos, "size", e.target.value)}
                      placeholder="e.g. 225/45R17"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Depth *</label>
                    <Input
                      value={t?.depth || ""}
                      onChange={(e) => updateTyre(pos, "depth", e.target.value)}
                      placeholder="e.g. 5mm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Brand *</label>
                    <Input
                      value={t?.brand || ""}
                      onChange={(e) => updateTyre(pos, "brand", e.target.value)}
                      placeholder="e.g. Michelin"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Type</label>
                    <select
                      value={t?.tyreType || "normal"}
                      onChange={(e) => updateTyre(pos, "tyreType", e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
                    >
                      <option value="normal">Normal</option>
                      <option value="run_flat">Run Flat</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          * All tyre fields must be completed before marking as complete.
        </p>
      </Section>
      </div>

      <Section title="Photos" defaultOpen={false}>
        <PhotoCapture
          handoverId={handoverId}
          photos={photos}
          onPhotosChange={setPhotos}
        />
      </Section>

      <Section title="Other Comments" defaultOpen={false}>
        <textarea
          value={otherComments}
          onChange={(e) => setOtherComments(e.target.value)}
          placeholder="Any additional comments..."
          rows={4}
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </Section>

      <div ref={collectionOutcomeSectionRef}>
      <Section title="Collection outcome" defaultOpen={true}>
        <p className="text-sm text-muted-foreground">
          Was this vehicle collection accepted or rejected? Required to complete the
          handover; drafts can be saved without a selection.
        </p>
        {collectionOutcomeError && (
          <p className="text-sm text-destructive font-medium" role="alert">
            Please choose Accepted or Rejected.
          </p>
        )}
        <div
          className={cn(
            "grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 rounded-lg p-1 -m-1 transition-colors",
            collectionOutcomeError && "ring-2 ring-destructive ring-offset-2 ring-offset-background"
          )}
        >
          <button
            type="button"
            onClick={() => {
              setCollectionOutcome("accepted");
              setCollectionOutcomeError(false);
              setCollectionRejectionReason("");
              setRejectionReasonError(false);
            }}
            className={cn(
              "min-h-[48px] rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors text-left",
              collectionOutcome === "accepted"
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:bg-muted/50"
            )}
          >
            Accepted
          </button>
          <button
            type="button"
            onClick={() => {
              setCollectionOutcome("rejected");
              setCollectionOutcomeError(false);
            }}
            className={cn(
              "min-h-[48px] rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors text-left",
              collectionOutcome === "rejected"
                ? "border-destructive bg-destructive/10"
                : "border-border bg-card hover:bg-muted/50"
            )}
          >
            Rejected
          </button>
        </div>
        {collectionOutcome === "rejected" && (
          <div
            ref={rejectionReasonRef}
            className="space-y-1.5 pt-2 pb-1"
          >
            <label className="text-sm font-medium" htmlFor="rejection-reason">
              Rejection reason
            </label>
            <p className="text-xs text-muted-foreground">
              Required to complete the handover when rejected; optional on drafts.
            </p>
            {rejectionReasonError && (
              <p className="text-sm text-destructive font-medium" role="alert">
                Please explain why the collection was rejected.
              </p>
            )}
            <textarea
              id="rejection-reason"
              value={collectionRejectionReason}
              onChange={(e) => {
                setCollectionRejectionReason(e.target.value);
                setRejectionReasonError(false);
              }}
              placeholder="Enter the reason for rejection..."
              rows={4}
              className={cn(
                "w-full rounded-md border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[120px]",
                rejectionReasonError
                  ? "border-destructive ring-1 ring-destructive/30"
                  : "border-input"
              )}
            />
          </div>
        )}
      </Section>
      </div>

      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:left-64 z-40 border-t border-border bg-card p-3 safe-bottom">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit("draft")}
            disabled={saving}
            className="min-h-[48px] flex-1"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save as Draft
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit("completed")}
            disabled={saving}
            className="min-h-[48px] flex-1"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Complete Handover
          </Button>
        </div>
      </div>
    </div>
  );
}
