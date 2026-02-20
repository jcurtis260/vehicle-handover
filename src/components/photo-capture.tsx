"use client";

import { useState, useRef } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface PhotoItem {
  id: string;
  url: string;
  category: string;
  caption: string;
}

interface PhotoCaptureProps {
  handoverId?: string;
  photos: PhotoItem[];
  onPhotosChange: (photos: PhotoItem[]) => void;
  fixedCategory?: string;
}

const CATEGORIES = [
  { value: "exterior", label: "Exterior" },
  { value: "interior", label: "Interior" },
  { value: "damage", label: "Damage" },
  { value: "tyres", label: "Tyres" },
  { value: "other", label: "Other" },
];

async function compressImage(file: File, maxWidth = 1920): Promise<File> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    const canvas = document.createElement("canvas");
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            resolve(
              new File([blob!], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
            );
          },
          "image/jpeg",
          0.8
        );
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function PhotoCapture({
  handoverId,
  photos,
  onPhotosChange,
  fixedCategory,
}: PhotoCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(fixedCategory || "exterior");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    const newPhotos: PhotoItem[] = [];
    for (const file of Array.from(files)) {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("category", selectedCategory);
      if (handoverId) formData.append("handoverId", handoverId);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        newPhotos.push({
          id: data.photo.id,
          url: data.url,
          category: selectedCategory,
          caption: "",
        });
      }
    }

    onPhotosChange([...photos, ...newPhotos]);
    setUploading(false);
  }

  function removePhoto(id: string) {
    onPhotosChange(photos.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!fixedCategory && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          className="min-h-[44px]"
        >
          <Camera className="h-4 w-4 mr-2" />
          Camera
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="min-h-[44px]"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>

        {uploading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group rounded-lg overflow-hidden border border-border aspect-square"
            >
              <Image
                src={photo.url}
                alt={photo.caption || photo.category}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              />
              <div className="absolute top-1 left-1">
                <span className="bg-black/60 text-white text-xs px-1.5 py-0.5 rounded capitalize">
                  {photo.category}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                className="absolute top-1 right-1 h-6 w-6 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
