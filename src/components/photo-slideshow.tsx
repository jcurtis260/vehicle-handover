"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Camera, ExternalLink } from "lucide-react";
import type { RecentPhoto } from "@/lib/actions/handovers";

const ADVANCE_MS = 5000;

export function PhotoSlideshow({ photos }: { photos: RecentPhoto[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = photos.length;

  const go = useCallback(
    (next: number) => {
      setIndex((prev) => (next + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (paused || count <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % count);
    }, ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused, count]);

  if (count === 0) return null;

  const current = photos[index];
  const vehicleLabel = `${current.vehicleMake} ${current.vehicleModel}`.trim();

  return (
    <div
      className="relative h-[28rem] xl:h-[34rem] w-full overflow-hidden rounded-xl border border-border bg-muted"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides (only the active one is mounted to avoid loading all at once) */}
      <Link
        href={`/handovers/${current.handoverId}`}
        className="absolute inset-0 block group"
      >
        <Image
          key={current.id}
          src={current.url}
          alt={current.caption || vehicleLabel || "Handover photo"}
          fill
          sizes="(min-width: 1024px) 1100px, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          priority
        />
        {/* Bottom gradient + caption */}
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white font-semibold truncate">
                {vehicleLabel || "Vehicle"}
                {current.vehicleRegistration ? (
                  <span className="ml-2 font-mono text-sm text-white/80">
                    {current.vehicleRegistration}
                  </span>
                ) : null}
              </p>
              {current.caption && (
                <p className="text-sm text-white/80 truncate">
                  {current.caption}
                </p>
              )}
            </div>
            <span className="flex items-center gap-1 text-xs text-white/80 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              View <ExternalLink className="h-3 w-3" />
            </span>
          </div>
        </div>
      </Link>

      {/* Header badge */}
      <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
        <Camera className="h-3.5 w-3.5" />
        Photo Gallery
      </div>

      {/* Counter */}
      <div className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
        {index + 1} / {count}
      </div>

      {/* Controls */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dots */}
          <div className="absolute inset-x-0 bottom-1 flex justify-center gap-1.5">
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to photo ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
