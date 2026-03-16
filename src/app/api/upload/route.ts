import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { handoverPhotos, handovers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const VALID_CATEGORIES = [
  "exterior",
  "interior",
  "damage",
  "tyres",
  "other",
  "v5",
  "signature",
] as const;

type PhotoCategory = (typeof VALID_CATEGORIES)[number];

function isValidCategory(value: string): value is PhotoCategory {
  return VALID_CATEGORIES.includes(value as PhotoCategory);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const handoverId = formData.get("handoverId") as string | null;
    const categoryRaw = (formData.get("category") as string) || "other";
    const caption = formData.get("caption") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed." },
        { status: 400 }
      );
    }

    const category: PhotoCategory = isValidCategory(categoryRaw)
      ? categoryRaw
      : "other";

    // Sanitize filename to prevent path traversal
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    const blob = await put(`handovers/${Date.now()}-${safeName}`, file, {
      access: "public",
    });

    if (handoverId && handoverId !== "undefined" && handoverId !== "null") {
      // Verify the handover exists and belongs to the current user (or admin)
      const [handover] = await db
        .select({ userId: handovers.userId })
        .from(handovers)
        .where(eq(handovers.id, handoverId))
        .limit(1);

      if (!handover) {
        return NextResponse.json({ error: "Handover not found" }, { status: 404 });
      }

      if (
        handover.userId !== session.user.id &&
        session.user.role !== "admin" &&
        !session.user.canEditAllReports
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const [photo] = await db
        .insert(handoverPhotos)
        .values({
          handoverId,
          blobUrl: blob.url,
          caption: caption?.slice(0, 500) || null,
          category,
        })
        .returning();

      return NextResponse.json({ photo, url: blob.url });
    }

    return NextResponse.json({
      photo: {
        id: `temp-${Date.now()}`,
        blobUrl: blob.url,
        category,
        caption: caption?.slice(0, 500) || null,
      },
      url: blob.url,
    });
  } catch (error) {
    console.error("[Upload] Error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
