"use server";

import { db } from "@/lib/db";
import {
  handovers,
  handoverChecks,
  tyreRecords,
  vehicles,
  handoverPhotos,
} from "@/lib/schema";
import { eq, and, or, ilike, desc, sql, count } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

interface CheckInput {
  checkItem: string;
  checked: boolean;
  comments: string;
}

interface TyreInput {
  position: "NSF" | "NSR" | "OSR" | "OSF";
  size: string;
  depth: string;
  brand: string;
  tyreType?: string;
}

interface PhotoInput {
  url: string;
  category: string;
  caption: string;
}

interface HandoverInput {
  make: string;
  model: string;
  registration: string;
  date: string;
  name: string;
  mileage: number | null;
  otherComments: string;
  status: "draft" | "completed";
  type?: "collection" | "delivery";
  checks: CheckInput[];
  tyres: TyreInput[];
  photos?: PhotoInput[];
}

export async function createHandover(input: HandoverInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const [vehicle] = await db
    .insert(vehicles)
    .values({
      make: input.make,
      model: input.model,
      registration: input.registration.toUpperCase(),
      createdBy: session.user.id,
    })
    .returning();

  const [handover] = await db
    .insert(handovers)
    .values({
      vehicleId: vehicle.id,
      userId: session.user.id,
      date: new Date(input.date),
      name: input.name,
      mileage: input.mileage,
      otherComments: input.otherComments || null,
      status: input.status,
      type: input.type || "collection",
    })
    .returning();

  if (input.checks.length > 0) {
    await db.insert(handoverChecks).values(
      input.checks.map((c) => ({
        handoverId: handover.id,
        checkItem: c.checkItem,
        checked: c.checked,
        comments: c.comments || null,
      }))
    );
  }

  if (input.tyres.length > 0) {
    await db.insert(tyreRecords).values(
      input.tyres.map((t) => ({
        handoverId: handover.id,
        position: t.position,
        size: t.size || null,
        depth: t.depth || null,
        brand: t.brand || null,
        tyreType: t.tyreType || "normal",
      }))
    );
  }

  if (input.photos && input.photos.length > 0) {
    await db.insert(handoverPhotos).values(
      input.photos.map((p) => ({
        handoverId: handover.id,
        blobUrl: p.url,
        caption: p.caption || null,
        category: (p.category || "other") as
          | "exterior"
          | "interior"
          | "damage"
          | "tyres"
          | "other"
          | "v5"
          | "signature",
      }))
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/search");
  return handover;
}

export async function updateHandover(
  handoverId: string,
  input: HandoverInput
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "admin" && !session.user.canEdit) {
    throw new Error("Forbidden: no edit permission");
  }

  const [existing] = await db
    .select()
    .from(handovers)
    .where(eq(handovers.id, handoverId))
    .limit(1);

  if (!existing) throw new Error("Not found");
  if (existing.userId !== session.user.id && session.user.role !== "admin") {
    throw new Error("Forbidden");
  }

  await db
    .update(vehicles)
    .set({
      make: input.make,
      model: input.model,
      registration: input.registration.toUpperCase(),
    })
    .where(eq(vehicles.id, existing.vehicleId));

  await db
    .update(handovers)
    .set({
      date: new Date(input.date),
      name: input.name,
      mileage: input.mileage,
      otherComments: input.otherComments || null,
      status: input.status,
      type: input.type || existing.type || "collection",
      updatedAt: new Date(),
    })
    .where(eq(handovers.id, handoverId));

  await db
    .delete(handoverChecks)
    .where(eq(handoverChecks.handoverId, handoverId));

  if (input.checks.length > 0) {
    await db.insert(handoverChecks).values(
      input.checks.map((c) => ({
        handoverId,
        checkItem: c.checkItem,
        checked: c.checked,
        comments: c.comments || null,
      }))
    );
  }

  await db.delete(tyreRecords).where(eq(tyreRecords.handoverId, handoverId));

  if (input.tyres.length > 0) {
    await db.insert(tyreRecords).values(
      input.tyres.map((t) => ({
        handoverId,
        position: t.position,
        size: t.size || null,
        depth: t.depth || null,
        brand: t.brand || null,
        tyreType: t.tyreType || "normal",
      }))
    );
  }

  // Replace photos: delete existing and re-insert from form state
  await db
    .delete(handoverPhotos)
    .where(eq(handoverPhotos.handoverId, handoverId));

  if (input.photos && input.photos.length > 0) {
    await db.insert(handoverPhotos).values(
      input.photos.map((p) => ({
        handoverId,
        blobUrl: p.url,
        caption: p.caption || null,
        category: (p.category || "other") as
          | "exterior"
          | "interior"
          | "damage"
          | "tyres"
          | "other"
          | "v5"
          | "signature",
      }))
    );
  }

  revalidatePath("/dashboard");
  revalidatePath(`/handovers/${handoverId}`);
  revalidatePath("/search");
  return { id: handoverId };
}

export async function getHandover(handoverId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const result = await db.query.handovers.findFirst({
    where: eq(handovers.id, handoverId),
    with: {
      vehicle: true,
      user: true,
      checks: true,
      tyres: true,
      photos: true,
    },
  });

  if (!result) return null;
  if (result.userId !== session.user.id && session.user.role !== "admin") {
    return null;
  }

  return result;
}

export async function listHandovers(limit = 20, offset = 0) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const isAdmin = session.user.role === "admin";
  const conditions = isAdmin ? undefined : eq(handovers.userId, session.user.id);

  const results = await db.query.handovers.findMany({
    where: conditions,
    with: { vehicle: true, user: true },
    orderBy: [desc(handovers.createdAt)],
    limit,
    offset,
  });

  return results;
}

export async function getHandoverStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const isAdmin = session.user.role === "admin";
  const userFilter = isAdmin ? sql`1=1` : eq(handovers.userId, session.user.id);

  const [totalResult] = await db
    .select({ value: count() })
    .from(handovers)
    .where(userFilter);

  const [draftResult] = await db
    .select({ value: count() })
    .from(handovers)
    .where(and(userFilter, eq(handovers.status, "draft")));

  const [completedResult] = await db
    .select({ value: count() })
    .from(handovers)
    .where(and(userFilter, eq(handovers.status, "completed")));

  return {
    total: totalResult.value,
    drafts: draftResult.value,
    completed: completedResult.value,
  };
}

export async function searchHandovers(query: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const isAdmin = session.user.role === "admin";
  const searchPattern = `%${query}%`;

  const searchConditions = or(
    ilike(vehicles.make, searchPattern),
    ilike(vehicles.model, searchPattern),
    ilike(vehicles.registration, searchPattern)
  );

  const userFilter = isAdmin
    ? searchConditions
    : and(eq(handovers.userId, session.user.id), searchConditions);

  const results = await db
    .select({
      id: handovers.id,
      date: handovers.date,
      name: handovers.name,
      status: handovers.status,
      type: handovers.type,
      mileage: handovers.mileage,
      vehicleMake: vehicles.make,
      vehicleModel: vehicles.model,
      vehicleRegistration: vehicles.registration,
    })
    .from(handovers)
    .innerJoin(vehicles, eq(handovers.vehicleId, vehicles.id))
    .where(userFilter)
    .orderBy(desc(handovers.createdAt))
    .limit(50);

  return results;
}

export async function deleteHandover(handoverId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "admin" && !session.user.canDelete) {
    throw new Error("Forbidden");
  }

  const [existing] = await db
    .select()
    .from(handovers)
    .where(eq(handovers.id, handoverId))
    .limit(1);

  if (!existing) throw new Error("Not found");
  if (existing.userId !== session.user.id && session.user.role !== "admin") {
    throw new Error("Forbidden");
  }

  // Delete photos from Vercel Blob before removing DB records
  const photos = await db
    .select({ blobUrl: handoverPhotos.blobUrl })
    .from(handoverPhotos)
    .where(eq(handoverPhotos.handoverId, handoverId));

  if (photos.length > 0) {
    const { del } = await import("@vercel/blob");
    const urls = photos.map((p) => p.blobUrl);
    try {
      await del(urls);
    } catch (err) {
      console.error("[Delete] Failed to delete blob files:", err);
    }
  }

  await db.delete(handovers).where(eq(handovers.id, handoverId));

  revalidatePath("/dashboard");
  revalidatePath("/search");
}

export async function linkPhotosToHandover(
  handoverId: string,
  photoIds: string[]
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  if (photoIds.length > 0) {
    for (const photoId of photoIds) {
      await db
        .update(handoverPhotos)
        .set({ handoverId })
        .where(eq(handoverPhotos.id, photoId));
    }
  }

  revalidatePath(`/handovers/${handoverId}`);
}
