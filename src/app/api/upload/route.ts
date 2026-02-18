import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { handoverPhotos } from "@/lib/schema";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const handoverId = formData.get("handoverId") as string | null;
    const category = (formData.get("category") as string) || "other";
    const caption = formData.get("caption") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const blob = await put(`handovers/${Date.now()}-${file.name}`, file, {
      access: "public",
    });

    // Only insert into DB if we have a real handover ID (editing existing handover)
    if (handoverId && handoverId !== "undefined" && handoverId !== "null") {
      const [photo] = await db
        .insert(handoverPhotos)
        .values({
          handoverId,
          blobUrl: blob.url,
          caption: caption || null,
          category: category as
            | "exterior"
            | "interior"
            | "damage"
            | "tyres"
            | "other",
        })
        .returning();

      return NextResponse.json({ photo, url: blob.url });
    }

    // For new handovers, just return the blob URL -- DB record created when handover is saved
    return NextResponse.json({
      photo: {
        id: `temp-${Date.now()}`,
        blobUrl: blob.url,
        category,
        caption: caption || null,
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
