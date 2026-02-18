"use client";

import { useState } from "react";
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
import {
  ChevronDown,
  ChevronUp,
  Save,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckState {
  checked: boolean;
  comments: string;
}

interface TyreState {
  size: string;
  depth: string;
  brand: string;
}

interface PhotoItem {
  id: string;
  url: string;
  category: string;
  caption: string;
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
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
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
      init[pos] = { size: "", depth: "", brand: "" };
    }
    return init;
  });

  const [photos, setPhotos] = useState<PhotoItem[]>(initialData?.photos || []);

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
    if (!make || !model || !registration || !name) {
      alert("Please fill in the vehicle details and name.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        make,
        model,
        registration,
        date,
        name,
        mileage: mileage ? parseInt(mileage) : null,
        otherComments,
        status,
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
    <div className="space-y-4 max-w-4xl mx-auto">
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
            <Input
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder="e.g. BMW"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Model</label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. 3 Series"
              required
            />
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

      <Section title="Tyre Information" defaultOpen={false}>
        <div className="space-y-4">
          {TYRE_POSITIONS.map((pos) => (
            <div key={pos} className="space-y-2">
              <h4 className="text-sm font-semibold">{pos}</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Size</label>
                  <Input
                    value={tyres[pos]?.size || ""}
                    onChange={(e) => updateTyre(pos, "size", e.target.value)}
                    placeholder="Size"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Depth</label>
                  <Input
                    value={tyres[pos]?.depth || ""}
                    onChange={(e) => updateTyre(pos, "depth", e.target.value)}
                    placeholder="Depth"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Brand</label>
                  <Input
                    value={tyres[pos]?.brand || ""}
                    onChange={(e) => updateTyre(pos, "brand", e.target.value)}
                    placeholder="Brand"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

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

      <div className="flex flex-col sm:flex-row gap-3 pt-4 pb-8">
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
  );
}
