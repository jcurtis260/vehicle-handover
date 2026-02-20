"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CHECK_ITEMS, CHECK_ITEM_LABELS, DELIVERY_CHECK_ITEMS, DELIVERY_CHECK_ITEM_LABELS, type CheckItemKey, type DeliveryCheckItemKey } from "@/lib/check-items";
import { PhotoCapture } from "@/components/photo-capture";
import { SignaturePad } from "@/components/signature-pad";
import { createHandover, updateHandover } from "@/lib/actions/handovers";
import { ChevronDown, Loader2, Save, CheckCircle } from "lucide-react";

interface CheckState {
  checked: boolean;
  comments: string;
}

interface PhotoItem {
  id: string;
  url: string;
  category: string;
  caption: string;
}

interface DeliveryFormProps {
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
    photos: PhotoItem[];
    signatureUrl?: string | null;
    signatoryName?: string;
  };
}

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
        className="flex w-full items-center justify-between p-4 font-semibold text-left hover:bg-accent/50 transition-colors"
      >
        {title}
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && <div className="p-4 pt-0 space-y-4">{children}</div>}
    </div>
  );
}

export function DeliveryForm({ mode, handoverId, initialData }: DeliveryFormProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [date, setDate] = useState(
    initialData?.date || new Date().toISOString().split("T")[0]
  );
  const [name, setName] = useState(initialData?.name || session?.user?.name || "");
  const [make, setMake] = useState(initialData?.make || "");
  const [model, setModel] = useState(initialData?.model || "");
  const [registration, setRegistration] = useState(initialData?.registration || "");
  const [mileage, setMileage] = useState(
    initialData?.mileage?.toString() || ""
  );

  const ALL_CHECK_KEYS = [...CHECK_ITEMS, ...DELIVERY_CHECK_ITEMS];

  const [checks, setChecks] = useState<Record<string, CheckState>>(() => {
    if (initialData?.checks) return initialData.checks;
    const init: Record<string, CheckState> = {};
    for (const key of ALL_CHECK_KEYS) {
      init[key] = { checked: false, comments: "" };
    }
    return init;
  });

  const [v5Photos, setV5Photos] = useState<PhotoItem[]>(
    initialData?.photos?.filter((p) => p.category === "v5") || []
  );

  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(
    initialData?.signatureUrl || null
  );
  const [signatoryName, setSignatoryName] = useState(initialData?.signatoryName || "");

  const [otherComments, setOtherComments] = useState(initialData?.otherComments || "");
  const [saving, setSaving] = useState(false);

  async function uploadSignatureBlob(dataUrl: string): Promise<string> {
    const resp = await fetch(dataUrl);
    const blob = await resp.blob();
    const file = new File([blob], `signature-${Date.now()}.png`, { type: "image/png" });
    const form = new FormData();
    form.append("file", file);
    form.append("category", "signature");
    if (handoverId) form.append("handoverId", handoverId);

    const uploadResp = await fetch("/api/upload", { method: "POST", body: form });
    const result = await uploadResp.json();
    return result.url;
  }

  async function handleSubmit(status: "draft" | "completed") {
    if (!make || !model || !registration || !name) {
      alert("Please fill in all required vehicle fields.");
      return;
    }

    setSaving(true);
    try {
      let signatureUrl: string | null = null;
      if (signatureDataUrl && signatureDataUrl.startsWith("data:")) {
        signatureUrl = await uploadSignatureBlob(signatureDataUrl);
      } else if (signatureDataUrl) {
        signatureUrl = signatureDataUrl;
      }

      const allPhotos: PhotoItem[] = [
        ...v5Photos.map((p) => ({ ...p, category: "v5" })),
      ];
      if (signatureUrl) {
        allPhotos.push({
          id: `sig-${Date.now()}`,
          url: signatureUrl,
          category: "signature",
          caption: signatoryName || "Customer Signature",
        });
      }

      const payload = {
        make,
        model,
        registration,
        date,
        name,
        mileage: mileage ? parseInt(mileage) : null,
        otherComments,
        status,
        type: "delivery" as const,
        checks: ALL_CHECK_KEYS.map((key) => ({
          checkItem: key,
          checked: checks[key]?.checked || false,
          comments: checks[key]?.comments || "",
        })),
        tyres: [],
        photos: allPhotos.map((p) => ({
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
    } catch {
      alert("Failed to save delivery handover.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pb-28">
      <Section title="Vehicle Details" defaultOpen={true}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Date *</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Inspector Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Inspector name"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Make *</label>
            <Input
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder="e.g. BMW"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Model *</label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. X5"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Registration *</label>
            <Input
              value={registration}
              onChange={(e) => setRegistration(e.target.value.toUpperCase())}
              placeholder="e.g. AB12 CDE"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Mileage</label>
            <Input
              type="number"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              placeholder="e.g. 45000"
            />
          </div>
        </div>
      </Section>

      <Section title="Vehicle Checks" defaultOpen={false}>
        <div className="space-y-3">
          {CHECK_ITEMS.map((key) => {
            const label = CHECK_ITEM_LABELS[key as CheckItemKey];
            return (
              <div key={key} className="space-y-2 py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={checks[key]?.checked || false}
                    onChange={(e) =>
                      setChecks((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], checked: e.target.checked },
                      }))
                    }
                    className="h-5 w-5 rounded border-border accent-primary shrink-0"
                  />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <Input
                  value={checks[key]?.comments || ""}
                  onChange={(e) =>
                    setChecks((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], comments: e.target.value },
                    }))
                  }
                  placeholder="Comments..."
                  className="text-sm"
                />
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Delivery Checklist" defaultOpen={true}>
        <div className="space-y-3">
          {DELIVERY_CHECK_ITEMS.map((key) => {
            const label = DELIVERY_CHECK_ITEM_LABELS[key as DeliveryCheckItemKey];
            return (
              <div key={key} className="space-y-2 py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={checks[key]?.checked || false}
                    onChange={(e) =>
                      setChecks((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], checked: e.target.checked },
                      }))
                    }
                    className="h-5 w-5 rounded border-border accent-primary shrink-0"
                  />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <Input
                  value={checks[key]?.comments || ""}
                  onChange={(e) =>
                    setChecks((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], comments: e.target.value },
                    }))
                  }
                  placeholder="Comments / details..."
                  className="text-sm"
                />
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="V5 Document Photo" defaultOpen={false}>
        <p className="text-sm text-muted-foreground mb-2">
          Take or upload a photo of the V5 document.
        </p>
        <PhotoCapture
          handoverId={handoverId}
          photos={v5Photos}
          onPhotosChange={setV5Photos}
          fixedCategory="v5"
        />
      </Section>

      <Section title="Customer Signature" defaultOpen={true}>
        <p className="text-sm text-muted-foreground mb-2">
          Customer to sign below to confirm collection of the vehicle.
        </p>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Customer Name *</label>
            <Input
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              placeholder="Full name of person signing"
            />
          </div>
          <SignaturePad
            onSignatureChange={setSignatureDataUrl}
            initialSignature={signatureDataUrl}
          />
        </div>
      </Section>

      <Section title="Other Comments" defaultOpen={false}>
        <textarea
          value={otherComments}
          onChange={(e) => setOtherComments(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          placeholder="Any additional notes..."
        />
      </Section>

      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:left-64 z-40 border-t border-border bg-card p-3 safe-bottom">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Button
            type="button"
            variant="outline"
            className="flex-1 min-h-[44px]"
            onClick={() => handleSubmit("draft")}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Draft
          </Button>
          <Button
            type="button"
            className="flex-1 min-h-[44px]"
            onClick={() => handleSubmit("completed")}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Complete Delivery
          </Button>
        </div>
      </div>
    </div>
  );
}
