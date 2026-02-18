import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { handoverPhotos } from "@/lib/schema";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
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

  const [photo] = await db
    .insert(handoverPhotos)
    .values({
      handoverId: handoverId || "00000000-0000-0000-0000-000000000000",
      blobUrl: blob.url,
      caption: caption || null,
      category: category as "exterior" | "interior" | "damage" | "tyres" | "other",
    })
    .returning();

  return NextResponse.json({ photo, url: blob.url });
}
