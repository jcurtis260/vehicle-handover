"use server";

import { db } from "@/lib/db";
import { vehicleMakes, vehicleModels, vehicles } from "@/lib/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const MAX_LABEL_LENGTH = 100;

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function validateLabel(value: string, field: string) {
  const normalized = normalizeLabel(value);
  if (!normalized) throw new Error(`${field} is required`);
  if (normalized.length > MAX_LABEL_LENGTH) {
    throw new Error(`${field} is too long`);
  }
  return normalized;
}

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

async function upsertCatalogMakeModel(makeValue: string, modelValue: string) {
  const makeName = validateLabel(makeValue, "Make");
  const modelName = validateLabel(modelValue, "Model");

  let [make] = await db
    .select({ id: vehicleMakes.id })
    .from(vehicleMakes)
    .where(sql`LOWER(${vehicleMakes.name}) = LOWER(${makeName})`)
    .limit(1);

  if (!make) {
    [make] = await db
      .insert(vehicleMakes)
      .values({ name: makeName })
      .returning({ id: vehicleMakes.id });
  }

  const [model] = await db
    .select({ id: vehicleModels.id })
    .from(vehicleModels)
    .where(
      and(
        eq(vehicleModels.makeId, make.id),
        sql`LOWER(${vehicleModels.name}) = LOWER(${modelName})`
      )
    )
    .limit(1);

  if (!model) {
    await db.insert(vehicleModels).values({ makeId: make.id, name: modelName });
  }
}

export async function getVehicleCatalog() {
  const makes = await db
    .select({
      id: vehicleMakes.id,
      name: vehicleMakes.name,
    })
    .from(vehicleMakes)
    .orderBy(asc(vehicleMakes.name));

  const models = await db
    .select({
      id: vehicleModels.id,
      makeId: vehicleModels.makeId,
      name: vehicleModels.name,
    })
    .from(vehicleModels)
    .orderBy(asc(vehicleModels.name));

  return makes.map((make) => ({
    ...make,
    models: models.filter((model) => model.makeId === make.id),
  }));
}

export async function addVehicleMake(name: string) {
  await requireAdminSession();
  const normalized = validateLabel(name, "Make");
  const [existing] = await db
    .select({ id: vehicleMakes.id })
    .from(vehicleMakes)
    .where(sql`LOWER(${vehicleMakes.name}) = LOWER(${normalized})`)
    .limit(1);
  if (existing) throw new Error("Make already exists");

  const [created] = await db
    .insert(vehicleMakes)
    .values({ name: normalized })
    .returning();

  revalidatePath("/settings");
  revalidatePath("/handovers/new");
  return created;
}

export async function renameVehicleMake(makeId: string, name: string) {
  await requireAdminSession();
  const normalized = validateLabel(name, "Make");
  const [existing] = await db
    .select({ id: vehicleMakes.id })
    .from(vehicleMakes)
    .where(
      and(
        sql`LOWER(${vehicleMakes.name}) = LOWER(${normalized})`,
        sql`${vehicleMakes.id} <> ${makeId}`
      )
    )
    .limit(1);
  if (existing) throw new Error("Make already exists");

  await db.update(vehicleMakes).set({ name: normalized }).where(eq(vehicleMakes.id, makeId));
  revalidatePath("/settings");
  revalidatePath("/handovers/new");
}

export async function deleteVehicleMake(makeId: string) {
  await requireAdminSession();
  const [modelCount] = await db
    .select({ value: sql<number>`COUNT(*)::int` })
    .from(vehicleModels)
    .where(eq(vehicleModels.makeId, makeId));
  if ((modelCount?.value || 0) > 0) {
    throw new Error("Cannot delete make with models. Delete models first.");
  }

  await db.delete(vehicleMakes).where(eq(vehicleMakes.id, makeId));
  revalidatePath("/settings");
  revalidatePath("/handovers/new");
}

export async function addVehicleModel(makeId: string, name: string) {
  await requireAdminSession();
  const normalized = validateLabel(name, "Model");
  const [make] = await db
    .select({ id: vehicleMakes.id })
    .from(vehicleMakes)
    .where(eq(vehicleMakes.id, makeId))
    .limit(1);
  if (!make) throw new Error("Make not found");

  const [existing] = await db
    .select({ id: vehicleModels.id })
    .from(vehicleModels)
    .where(
      and(
        eq(vehicleModels.makeId, makeId),
        sql`LOWER(${vehicleModels.name}) = LOWER(${normalized})`
      )
    )
    .limit(1);
  if (existing) throw new Error("Model already exists for this make");

  const [created] = await db
    .insert(vehicleModels)
    .values({ makeId, name: normalized })
    .returning();

  revalidatePath("/settings");
  revalidatePath("/handovers/new");
  return created;
}

export async function renameVehicleModel(modelId: string, name: string) {
  await requireAdminSession();
  const normalized = validateLabel(name, "Model");
  const [current] = await db
    .select({ id: vehicleModels.id, makeId: vehicleModels.makeId })
    .from(vehicleModels)
    .where(eq(vehicleModels.id, modelId))
    .limit(1);
  if (!current) throw new Error("Model not found");

  const [existing] = await db
    .select({ id: vehicleModels.id })
    .from(vehicleModels)
    .where(
      and(
        eq(vehicleModels.makeId, current.makeId),
        sql`LOWER(${vehicleModels.name}) = LOWER(${normalized})`,
        sql`${vehicleModels.id} <> ${modelId}`
      )
    )
    .limit(1);
  if (existing) throw new Error("Model already exists for this make");

  await db.update(vehicleModels).set({ name: normalized }).where(eq(vehicleModels.id, modelId));
  revalidatePath("/settings");
  revalidatePath("/handovers/new");
}

export async function deleteVehicleModel(modelId: string) {
  await requireAdminSession();
  await db.delete(vehicleModels).where(eq(vehicleModels.id, modelId));
  revalidatePath("/settings");
  revalidatePath("/handovers/new");
}

export async function ensureCatalogMakeModel(makeValue: string, modelValue: string) {
  // Called by form submit flow; any authenticated user may trigger this for "other model" behavior.
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  await upsertCatalogMakeModel(makeValue, modelValue);
}

export async function backfillVehicleCatalogFromVehicles() {
  await requireAdminSession();

  const existingPairs = await db
    .selectDistinct({
      make: vehicles.make,
      model: vehicles.model,
    })
    .from(vehicles);

  for (const pair of existingPairs) {
    const make = normalizeLabel(pair.make || "");
    const model = normalizeLabel(pair.model || "");
    if (!make || !model) continue;
    await upsertCatalogMakeModel(make, model);
  }
}
