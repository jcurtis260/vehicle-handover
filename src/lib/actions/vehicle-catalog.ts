"use server";

import { db } from "@/lib/db";
import { vehicleMakes, vehicleModels, vehicles } from "@/lib/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const MAX_LABEL_LENGTH = 100;
const DEFAULT_TOP_VEHICLE_CATALOG: Array<{ make: string; models: string[] }> = [
  { make: "Abarth", models: ["500", "595", "695", "124 Spider"] },
  { make: "Acura", models: ["ILX", "TLX", "RDX", "MDX"] },
  { make: "Alfa Romeo", models: ["Giulia", "Stelvio", "Tonale", "Giulietta"] },
  { make: "Alpine", models: ["A110", "A110 S", "A110 GT", "A290"] },
  { make: "Aston Martin", models: ["DB11", "DBX", "Vantage", "Rapide"] },
  { make: "Audi", models: ["A1", "A3", "A4", "Q5"] },
  { make: "Bentley", models: ["Bentayga", "Continental GT", "Flying Spur", "Mulsanne"] },
  { make: "BMW", models: ["1 Series", "3 Series", "5 Series", "X5"] },
  { make: "BYD", models: ["Atto 3", "Dolphin", "Seal", "Han"] },
  { make: "Cadillac", models: ["CT4", "CT5", "XT4", "Escalade"] },
  { make: "Chevrolet", models: ["Spark", "Cruze", "Malibu", "Tahoe"] },
  { make: "Chrysler", models: ["300", "Pacifica", "Voyager", "Aspen"] },
  { make: "Citroen", models: ["C1", "C3", "C4", "C5 Aircross"] },
  { make: "Cupra", models: ["Born", "Formentor", "Leon", "Ateca"] },
  { make: "Dacia", models: ["Sandero", "Duster", "Jogger", "Spring"] },
  { make: "Daihatsu", models: ["Sirion", "Terios", "Copen", "Cuore"] },
  { make: "DS", models: ["DS 3", "DS 4", "DS 7", "DS 9"] },
  { make: "Ferrari", models: ["Roma", "Portofino", "SF90", "296 GTB"] },
  { make: "Fiat", models: ["500", "Panda", "Tipo", "500X"] },
  { make: "Fisker", models: ["Ocean", "PEAR", "Ronin", "Alaska"] },
  { make: "Ford", models: ["Fiesta", "Focus", "Puma", "Kuga"] },
  { make: "Genesis", models: ["G70", "G80", "GV70", "GV80"] },
  { make: "GMC", models: ["Terrain", "Acadia", "Yukon", "Sierra"] },
  { make: "GWM", models: ["Ora 03", "Haval Jolion", "Haval H6", "Poer"] },
  { make: "Honda", models: ["Jazz", "Civic", "HR-V", "CR-V"] },
  { make: "Hummer", models: ["H2", "H3", "EV Pickup", "EV SUV"] },
  { make: "Hyundai", models: ["i10", "i20", "i30", "Tucson"] },
  { make: "INEOS", models: ["Grenadier", "Quartermaster", "Station Wagon", "Utility Wagon"] },
  { make: "Infiniti", models: ["Q30", "Q50", "QX50", "QX70"] },
  { make: "Isuzu", models: ["D-Max", "MU-X", "Trooper", "Rodeo"] },
  { make: "Iveco", models: ["Daily", "Eurocargo", "S-Way", "X-Way"] },
  { make: "Jaguar", models: ["XE", "XF", "E-PACE", "F-PACE"] },
  { make: "Jeep", models: ["Renegade", "Compass", "Wrangler", "Grand Cherokee"] },
  { make: "Kia", models: ["Picanto", "Ceed", "Niro", "Sportage"] },
  { make: "Koenigsegg", models: ["Jesko", "Gemera", "Regera", "Agera"] },
  { make: "Lamborghini", models: ["Huracan", "Aventador", "Urus", "Revuelto"] },
  { make: "Lancia", models: ["Ypsilon", "Delta", "Thema", "Voyager"] },
  { make: "Land Rover", models: ["Defender", "Discovery Sport", "Range Rover Evoque", "Range Rover Sport"] },
  { make: "Lexus", models: ["UX", "NX", "RX", "ES"] },
  { make: "Lincoln", models: ["Corsair", "Nautilus", "Aviator", "Navigator"] },
  { make: "Lotus", models: ["Emira", "Evora", "Elise", "Eletre"] },
  { make: "Lucid", models: ["Air Pure", "Air Touring", "Air Grand Touring", "Gravity"] },
  { make: "Maserati", models: ["Ghibli", "Levante", "Grecale", "Quattroporte"] },
  { make: "Mazda", models: ["Mazda2", "Mazda3", "CX-30", "CX-5"] },
  { make: "McLaren", models: ["570S", "720S", "Artura", "GT"] },
  { make: "Mercedes-Benz", models: ["A-Class", "C-Class", "E-Class", "GLC"] },
  { make: "MG", models: ["MG3", "MG4", "ZS", "HS"] },
  { make: "MINI", models: ["Hatch", "Clubman", "Countryman", "Convertible"] },
  { make: "Mitsubishi", models: ["Mirage", "ASX", "Outlander", "L200"] },
  { make: "Morgan", models: ["Plus Four", "Plus Six", "Super 3", "Roadster"] },
  { make: "Nissan", models: ["Micra", "Juke", "Qashqai", "X-Trail"] },
  { make: "Opel", models: ["Corsa", "Astra", "Mokka", "Grandland"] },
  { make: "Pagani", models: ["Huayra", "Zonda", "Utopia", "Huayra BC"] },
  { make: "Peugeot", models: ["208", "2008", "308", "3008"] },
  { make: "Polestar", models: ["Polestar 2", "Polestar 3", "Polestar 4", "Polestar 5"] },
  { make: "Pontiac", models: ["G6", "G8", "Vibe", "Firebird"] },
  { make: "Porsche", models: ["Macan", "Cayenne", "Panamera", "911"] },
  { make: "RAM", models: ["1500", "2500", "3500", "ProMaster"] },
  { make: "Renault", models: ["Clio", "Captur", "Megane", "Arkana"] },
  { make: "Rimac", models: ["Nevera", "Concept One", "Concept S", "Concept Two"] },
  { make: "Rolls-Royce", models: ["Ghost", "Wraith", "Cullinan", "Phantom"] },
  { make: "Saab", models: ["9-3", "9-5", "900", "9-7X"] },
  { make: "SEAT", models: ["Ibiza", "Leon", "Arona", "Ateca"] },
  { make: "Skoda", models: ["Fabia", "Scala", "Octavia", "Kodiaq"] },
  { make: "Smart", models: ["fortwo", "forfour", "#1", "#3"] },
  { make: "SsangYong", models: ["Korando", "Tivoli", "Rexton", "Musso"] },
  { make: "Subaru", models: ["Impreza", "Forester", "Outback", "XV"] },
  { make: "Suzuki", models: ["Swift", "Ignis", "Vitara", "S-Cross"] },
  { make: "Tata", models: ["Tiago", "Nexon", "Harrier", "Safari"] },
  { make: "Tesla", models: ["Model 3", "Model S", "Model X", "Model Y"] },
  { make: "Toyota", models: ["Yaris", "Corolla", "C-HR", "RAV4"] },
  { make: "Vauxhall", models: ["Corsa", "Astra", "Mokka", "Grandland"] },
  { make: "Volkswagen", models: ["Polo", "Golf", "T-Roc", "Tiguan"] },
  { make: "Volvo", models: ["XC40", "XC60", "XC90", "S90"] },
  { make: "Alpine EV", models: ["A290 GT", "A290 GTS", "A390", "A490"] },
  { make: "Aiways", models: ["U5", "U6", "U7", "U8"] },
  { make: "Arcfox", models: ["Alpha S", "Alpha T", "Koala", "GT"] },
  { make: "Baojun", models: ["530", "RC-5", "KiWi EV", "Yep"] },
  { make: "Bestune", models: ["T77", "B70", "T99", "NAT"] },
  { make: "Brilliance", models: ["V3", "V6", "H3", "H530"] },
  { make: "Changan", models: ["CS35", "CS55", "CS75", "UNI-T"] },
  { make: "Chery", models: ["Tiggo 4", "Tiggo 7", "Tiggo 8", "Arrizo 5"] },
  { make: "Dongfeng", models: ["Fengon 580", "Aeolus Yixuan", "EX1", "Voyah Free"] },
  { make: "FAW", models: ["Bestune T55", "Bestune B70", "Hongqi H5", "Hongqi E-HS9"] },
  { make: "Geely", models: ["Coolray", "Azkarra", "Emgrand", "Geometry C"] },
  { make: "Great Wall", models: ["Haval H2", "Haval H6", "Tank 300", "Poer"] },
  { make: "Hongqi", models: ["H5", "H7", "HS5", "E-HS9"] },
  { make: "JAC", models: ["S3", "S4", "T8", "E-JS4"] },
  { make: "Jetour", models: ["X70", "X90", "Dashing", "Traveller"] },
  { make: "Leapmotor", models: ["T03", "C01", "C11", "C10"] },
  { make: "Li Auto", models: ["L7", "L8", "L9", "Mega"] },
  { make: "Lynk & Co", models: ["01", "02", "03", "05"] },
  { make: "Maxus", models: ["T60", "T90", "eDeliver 3", "MIFA 9"] },
  { make: "Nio", models: ["ET5", "ET7", "ES6", "EL6"] },
  { make: "Ora", models: ["Funky Cat", "Good Cat", "Ballet Cat", "Lightning Cat"] },
  { make: "Roewe", models: ["i5", "RX5", "Ei5", "Marvel R"] },
  { make: "Seres", models: ["3", "5", "SF5", "Aito M5"] },
  { make: "Skywell", models: ["ET5", "HT-i", "Q", "EEA"] },
  { make: "Voyah", models: ["Free", "Dream", "Passion", "Courage"] },
  { make: "Wuling", models: ["Hongguang Mini EV", "Bingo", "Almaz", "Victory"] },
  { make: "XPeng", models: ["P7", "P5", "G6", "G9"] },
  { make: "Zeekr", models: ["001", "009", "X", "007"] },
];

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

async function seedDefaultVehicleCatalogIfNeeded() {
  const [countResult] = await db
    .select({ value: sql<number>`COUNT(*)::int` })
    .from(vehicleMakes);

  // If no makes exist yet, seed the large starter catalog.
  if ((countResult?.value || 0) > 0) return;

  for (const entry of DEFAULT_TOP_VEHICLE_CATALOG) {
    for (const model of entry.models) {
      await upsertCatalogMakeModel(entry.make, model);
    }
  }
}

export async function getVehicleCatalog() {
  await seedDefaultVehicleCatalogIfNeeded();

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

  for (const entry of DEFAULT_TOP_VEHICLE_CATALOG) {
    for (const model of entry.models) {
      await upsertCatalogMakeModel(entry.make, model);
    }
  }

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
