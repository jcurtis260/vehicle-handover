"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  initialSignature?: string | null;
}

export function SignaturePad({ onSignatureChange, initialSignature }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!initialSignature);

  const getCoords = useCallback(
    (e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if ("touches" in e) {
        const touch = e.touches[0];
        if (!touch) return null;
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const coords = getCoords(e);
      if (!ctx || !coords) return;
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      setIsDrawing(true);
    },
    [getCoords]
  );

  const draw = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const coords = getCoords(e);
      if (!ctx || !coords) return;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    },
    [isDrawing, getCoords]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setHasSignature(true);
    const canvas = canvasRef.current;
    if (canvas) {
      onSignatureChange(canvas.toDataURL("image/png"));
    }
  }, [isDrawing, onSignatureChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (initialSignature) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = initialSignature;
    }

    const mDown = (e: MouseEvent) => startDrawing(e);
    const mMove = (e: MouseEvent) => draw(e);
    const mUp = () => stopDrawing();
    const tStart = (e: TouchEvent) => startDrawing(e);
    const tMove = (e: TouchEvent) => draw(e);
    const tEnd = () => stopDrawing();

    canvas.addEventListener("mousedown", mDown);
    canvas.addEventListener("mousemove", mMove);
    window.addEventListener("mouseup", mUp);
    canvas.addEventListener("touchstart", tStart, { passive: false });
    canvas.addEventListener("touchmove", tMove, { passive: false });
    window.addEventListener("touchend", tEnd);

    return () => {
      canvas.removeEventListener("mousedown", mDown);
      canvas.removeEventListener("mousemove", mMove);
      window.removeEventListener("mouseup", mUp);
      canvas.removeEventListener("touchstart", tStart);
      canvas.removeEventListener("touchmove", tMove);
      window.removeEventListener("touchend", tEnd);
    };
  }, [startDrawing, draw, stopDrawing, initialSignature]);

  function clearSignature() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange(null);
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg border-2 border-dashed border-border bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full h-[150px] sm:h-[200px] cursor-crosshair touch-none"
        />
        {!hasSignature && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-neutral-400">Sign here</p>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
          disabled={!hasSignature}
        >
          <Eraser className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
}
