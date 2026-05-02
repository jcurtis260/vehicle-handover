"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createHandover, updateHandover } from "@/lib/actions/handovers";
import { getVehicleCatalog } from "@/lib/actions/vehicle-catalog";
import type {
  DynamicAnswerValue,
  DynamicFormTemplateDetails,
} from "@/lib/dynamic-forms";
import { PhotoCapture } from "@/components/photo-capture";
import { SignaturePad } from "@/components/signature-pad";
import { CheckCircle, Loader2, Save } from "lucide-react";

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

interface DynamicHandoverFormProps {
  mode: "create" | "edit";
  template: DynamicFormTemplateDetails;
  handoverId?: string;
  initialData?: {
    make: string;
    model: string;
    registration: string;
    date: string;
    name: string;
    mileage: number | null;
    otherComments: string;
    status?: "draft" | "completed";
    responses?: Record<string, DynamicAnswerValue>;
  };
}

export function DynamicHandoverForm({
  mode,
  template,
  handoverId,
  initialData,
}: DynamicHandoverFormProps) {
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
  const [mileage, setMileage] = useState(initialData?.mileage?.toString() || "");
  const [otherComments, setOtherComments] = useState(initialData?.otherComments || "");
  const [catalogMakes, setCatalogMakes] = useState<CatalogMake[]>([]);
  const [formError, setFormError] = useState("");

  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [booleanValues, setBooleanValues] = useState<Record<string, boolean>>({});
  const [numberValues, setNumberValues] = useState<Record<string, string>>({});
  const [multiValues, setMultiValues] = useState<Record<string, string[]>>({});
  const [photoValues, setPhotoValues] = useState<Record<string, PhotoItem[]>>({});
  const [signatureValues, setSignatureValues] = useState<Record<string, string | null>>({});

  const selectedMake = catalogMakes.find((item) => item.name === make);
  const modelsForSelectedMake = selectedMake?.models ?? [];

  useEffect(() => {
    const initialText: Record<string, string> = {};
    const initialBoolean: Record<string, boolean> = {};
    const initialNumber: Record<string, string> = {};
    const initialMulti: Record<string, string[]> = {};
    const initialPhotos: Record<string, PhotoItem[]> = {};
    const initialSignatures: Record<string, string | null> = {};

    for (const question of template.questions) {
      const raw = initialData?.responses?.[question.id];
      if (question.type === "boolean") {
        initialBoolean[question.id] = raw === true;
      } else if (question.type === "number") {
        initialNumber[question.id] =
          typeof raw === "number" && Number.isFinite(raw) ? String(raw) : "";
      } else if (question.type === "multi_select") {
        initialMulti[question.id] = Array.isArray(raw)
          ? raw.filter((item): item is string => typeof item === "string")
          : [];
      } else if (question.type === "photo") {
        initialPhotos[question.id] = Array.isArray(raw)
          ? raw
              .filter((item): item is string => typeof item === "string")
              .map((url) => ({
                id: `photo-${question.id}-${url}`,
                url,
                category: "other",
                caption: question.label,
              }))
          : [];
      } else if (question.type === "signature") {
        initialSignatures[question.id] = typeof raw === "string" ? raw : null;
      } else {
        initialText[question.id] = typeof raw === "string" ? raw : "";
      }
    }

    setTextValues(initialText);
    setBooleanValues(initialBoolean);
    setNumberValues(initialNumber);
    setMultiValues(initialMulti);
    setPhotoValues(initialPhotos);
    setSignatureValues(initialSignatures);
  }, [initialData?.responses, template.questions]);

  useEffect(() => {
    let alive = true;
    getVehicleCatalog()
      .then((catalog) => {
        if (!alive) return;
        setCatalogMakes(catalog);
        if (initialData?.model) {
          const makeMatch = catalog.find((item) => item.name === (initialData.make || ""));
          const hasModel = makeMatch?.models.some((item) => item.name === initialData.model);
          if (makeMatch && !hasModel) {
            setModel("__other__");
            setCustomModel(initialData.model);
          }
        }
      })
      .catch((error) => {
        console.error("[VehicleCatalog] Failed to load catalog:", error);
      });

    return () => {
      alive = false;
    };
  }, [initialData?.make, initialData?.model]);

  const orderedQuestions = useMemo(
    () => template.questions.slice().sort((a, b) => a.position - b.position),
    [template.questions]
  );

  async function uploadSignatureBlob(dataUrl: string): Promise<string> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], `signature-${Date.now()}.png`, { type: "image/png" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", "signature");
    if (handoverId) formData.append("handoverId", handoverId);

    const uploadResponse = await fetch("/api/upload", { method: "POST", body: formData });
    const result = await uploadResponse.json();
    if (!uploadResponse.ok || !result?.url) {
      throw new Error("Failed to upload signature");
    }
    return result.url as string;
  }

  function buildResponses() {
    return orderedQuestions.map((question) => {
      if (question.type === "boolean") {
        return {
          questionId: question.id,
          questionKey: question.key,
          questionLabel: question.label,
          questionType: question.type,
          value: Boolean(booleanValues[question.id]),
        };
      }

      if (question.type === "number") {
        const raw = (numberValues[question.id] || "").trim();
        return {
          questionId: question.id,
          questionKey: question.key,
          questionLabel: question.label,
          questionType: question.type,
          value: raw === "" ? null : Number.parseFloat(raw),
        };
      }

      if (question.type === "multi_select") {
        return {
          questionId: question.id,
          questionKey: question.key,
          questionLabel: question.label,
          questionType: question.type,
          value: multiValues[question.id] || [],
        };
      }

      if (question.type === "photo") {
        return {
          questionId: question.id,
          questionKey: question.key,
          questionLabel: question.label,
          questionType: question.type,
          value: (photoValues[question.id] || []).map((photo) => photo.url),
        };
      }

      if (question.type === "signature") {
        return {
          questionId: question.id,
          questionKey: question.key,
          questionLabel: question.label,
          questionType: question.type,
          value: signatureValues[question.id] || null,
        };
      }

      return {
        questionId: question.id,
        questionKey: question.key,
        questionLabel: question.label,
        questionType: question.type,
        value: (textValues[question.id] || "").trim() || null,
      };
    });
  }

  async function handleSubmit(status: "draft" | "completed") {
    const resolvedModel = model === "__other__" ? customModel.trim() : model;
    if (!make || !resolvedModel || !registration || !name) {
      setFormError("Please fill in the vehicle details and name.");
      return;
    }

    setFormError("");
    setSaving(true);

    try {
      const signatureUploads: Record<string, string | null> = { ...signatureValues };
      const dynamicPhotos: PhotoItem[] = [];

      for (const question of orderedQuestions) {
        if (question.type === "photo") {
          const entries = photoValues[question.id] || [];
          for (const photo of entries) {
            dynamicPhotos.push({
              id: photo.id,
              url: photo.url,
              category: "other",
              caption: `${template.name} - ${question.label}`,
            });
          }
        }
        if (question.type === "signature") {
          const current = signatureValues[question.id];
          if (current && current.startsWith("data:")) {
            signatureUploads[question.id] = await uploadSignatureBlob(current);
            dynamicPhotos.push({
              id: `sig-${question.id}-${Date.now()}`,
              url: signatureUploads[question.id]!,
              category: "signature",
              caption: `${template.name} - ${question.label}`,
            });
          } else if (current) {
            dynamicPhotos.push({
              id: `sig-${question.id}-existing`,
              url: current,
              category: "signature",
              caption: `${template.name} - ${question.label}`,
            });
          }
        }
      }

      setSignatureValues(signatureUploads);

      const payload = {
        make,
        model: resolvedModel,
        registration,
        date,
        name,
        mileage: mileage ? parseInt(mileage, 10) : null,
        otherComments,
        status,
        type: "dynamic" as const,
        templateId: template.id,
        templateResponses: buildResponses().map((response) =>
          response.questionType === "signature"
            ? { ...response, value: signatureUploads[response.questionId] || null }
            : response
        ),
        checks: [],
        tyres: [],
        photos: dynamicPhotos.map((photo) => ({
          url: photo.url,
          category: photo.category,
          caption: photo.caption,
        })),
      };

      const result =
        mode === "edit" && handoverId
          ? await updateHandover(handoverId, payload)
          : await createHandover(payload);

      router.push(`/handovers/${result.id}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to save form.");
    } finally {
      setSaving(false);
    }
  }

  function toggleMultiValue(questionId: string, option: string) {
    setMultiValues((prev) => {
      const current = prev[questionId] || [];
      const exists = current.includes(option);
      return {
        ...prev,
        [questionId]: exists
          ? current.filter((item) => item !== option)
          : [...current, option],
      };
    });
  }

  return (
    <div className="space-y-4 pb-28">
      {formError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {formError}
        </div>
      )}

      <div className="rounded-xl border border-border p-4 space-y-4">
        <h2 className="text-lg font-semibold">Vehicle Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Date</label>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Inspector name"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Make</label>
            <select
              value={make}
              onChange={(event) => {
                setMake(event.target.value);
                setModel("");
                setCustomModel("");
              }}
              className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select make</option>
              {catalogMakes.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Model</label>
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select model</option>
              {modelsForSelectedMake.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
              <option value="__other__">Other...</option>
            </select>
          </div>
          {model === "__other__" && (
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Other Model</label>
              <Input
                value={customModel}
                onChange={(event) => setCustomModel(event.target.value)}
                placeholder="Enter model"
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium">Registration</label>
            <Input
              value={registration}
              onChange={(event) => setRegistration(event.target.value.toUpperCase())}
              placeholder="AB12 CDE"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Mileage</label>
            <Input
              type="number"
              value={mileage}
              onChange={(event) => setMileage(event.target.value)}
              placeholder="Mileage"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-4">
        <h2 className="text-lg font-semibold">{template.name}</h2>
        {template.description && (
          <p className="text-sm text-muted-foreground">{template.description}</p>
        )}

        {orderedQuestions.map((question) => (
          <div key={question.id} className="space-y-1.5">
            <label className="text-sm font-medium">
              {question.label}
              {question.required ? " *" : ""}
            </label>
            {question.helpText && (
              <p className="text-xs text-muted-foreground">{question.helpText}</p>
            )}

            {(question.type === "text" || question.type === "date") && (
              <Input
                type={question.type === "date" ? "date" : "text"}
                value={textValues[question.id] || ""}
                onChange={(event) =>
                  setTextValues((prev) => ({
                    ...prev,
                    [question.id]: event.target.value,
                  }))
                }
              />
            )}

            {question.type === "textarea" && (
              <textarea
                value={textValues[question.id] || ""}
                onChange={(event) =>
                  setTextValues((prev) => ({
                    ...prev,
                    [question.id]: event.target.value,
                  }))
                }
                rows={4}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
              />
            )}

            {question.type === "boolean" && (
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(booleanValues[question.id])}
                  onChange={(event) =>
                    setBooleanValues((prev) => ({
                      ...prev,
                      [question.id]: event.target.checked,
                    }))
                  }
                  className="rounded"
                />
                Yes
              </label>
            )}

            {question.type === "number" && (
              <Input
                type="number"
                value={numberValues[question.id] || ""}
                onChange={(event) =>
                  setNumberValues((prev) => ({
                    ...prev,
                    [question.id]: event.target.value,
                  }))
                }
              />
            )}

            {question.type === "single_select" && (
              <select
                value={textValues[question.id] || ""}
                onChange={(event) =>
                  setTextValues((prev) => ({
                    ...prev,
                    [question.id]: event.target.value,
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
              >
                <option value="">Select</option>
                {(question.optionsJson || []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {question.type === "multi_select" && (
              <div className="space-y-2">
                {(question.optionsJson || []).map((option) => {
                  const checked = (multiValues[question.id] || []).includes(option);
                  return (
                    <label key={option} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMultiValue(question.id, option)}
                        className="rounded"
                      />
                      {option}
                    </label>
                  );
                })}
              </div>
            )}

            {question.type === "photo" && (
              <PhotoCapture
                handoverId={handoverId}
                photos={photoValues[question.id] || []}
                onPhotosChange={(next) =>
                  setPhotoValues((prev) => ({ ...prev, [question.id]: next }))
                }
                fixedCategory="other"
              />
            )}

            {question.type === "signature" && (
              <SignaturePad
                initialSignature={signatureValues[question.id] || null}
                onSignatureChange={(value) =>
                  setSignatureValues((prev) => ({ ...prev, [question.id]: value }))
                }
              />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border p-4 space-y-1.5">
        <label className="text-sm font-medium">Other Comments</label>
        <textarea
          value={otherComments}
          onChange={(event) => setOtherComments(event.target.value)}
          rows={4}
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
        />
      </div>

      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:left-64 z-40 border-t border-border bg-card p-3 safe-bottom">
        <div className="flex flex-col sm:flex-row gap-2 max-w-4xl mx-auto">
          <Button
            type="button"
            variant="outline"
            className="min-h-[48px] flex-1"
            onClick={() => handleSubmit("draft")}
            disabled={saving}
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
            className="min-h-[48px] flex-1"
            onClick={() => handleSubmit("completed")}
            disabled={saving}
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
