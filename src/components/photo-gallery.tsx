"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Photo {
  id: string;
  blobUrl: string;
  caption: string | null;
  category: string;
}

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const grouped = photos.reduce<Record<string, Photo[]>>((acc, photo) => {
    const cat = photo.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(photo);
    return acc;
  }, {});

  function openLightbox(index: number) {
    setLightboxIndex(index);
  }

  function closeLightbox() {
    setLightboxIndex(null);
  }

  function navigate(dir: -1 | 1) {
    if (lightboxIndex === null) return;
    const next = lightboxIndex + dir;
    if (next >= 0 && next < photos.length) {
      setLightboxIndex(next);
    }
  }

  return (
    <>
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, catPhotos]) => (
          <div key={category}>
            <h4 className="text-sm font-medium capitalize mb-2">{category}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {catPhotos.map((photo) => {
                const globalIndex = photos.indexOf(photo);
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => openLightbox(globalIndex)}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all"
                  >
                    <Image
                      src={photo.blobUrl}
                      alt={photo.caption || category}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <X className="h-8 w-8" />
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(-1);
              }}
              className="absolute left-4 text-white hover:text-gray-300 z-10"
            >
              <ChevronLeft className="h-10 w-10" />
            </button>
          )}

          {lightboxIndex < photos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(1);
              }}
              className="absolute right-4 text-white hover:text-gray-300 z-10"
            >
              <ChevronRight className="h-10 w-10" />
            </button>
          )}

          <div
            className="relative max-w-[90vw] max-h-[85vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[lightboxIndex].blobUrl}
              alt={photos[lightboxIndex].caption || "Photo"}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          </div>

          {photos[lightboxIndex].caption && (
            <p className="absolute bottom-6 text-white text-center text-sm">
              {photos[lightboxIndex].caption}
            </p>
          )}
        </div>
      )}
    </>
  );
}
