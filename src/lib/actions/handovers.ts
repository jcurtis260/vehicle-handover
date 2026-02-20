"use server";

import { db } from "@/lib/db";
import {
  handovers,
  handoverChecks,
  tyreRecords,
  vehicles,
  handoverPhotos,
  users,
} from "@/lib/schema";
import {
  eq,
  and,
  or,
  ilike,
  desc,
  asc,
  sql,
  count,
  gte,
  lte,
} from "drizzle-orm";
import {
  CHECK_ITEM_LABELS,
  DELIVERY_CHECK_ITEM_LABELS,
  type CheckItemKey,
  type DeliveryCheckItemKey,
} from "@/lib/check-items";
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

export async function getDashboardAnalytics() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const isAdmin = session.user.role === "admin";
  const userFilter = isAdmin ? sql`1=1` : eq(handovers.userId, session.user.id);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const allLabels: Record<string, string> = {
    ...CHECK_ITEM_LABELS,
    ...DELIVERY_CHECK_ITEM_LABELS,
  };

  const [
    collectionsResult,
    deliveriesResult,
    thisMonthResult,
    lastMonthResult,
    passRateResult,
    tyreStatsResult,
    photoCountResult,
    damagePhotoResult,
    topMakesResult,
    monthlyResult,
    failedChecksResult,
    inspectorResult,
  ] = await Promise.all([
    // Collections count
    db
      .select({ value: count() })
      .from(handovers)
      .where(and(userFilter, eq(handovers.type, "collection"))),

    // Deliveries count
    db
      .select({ value: count() })
      .from(handovers)
      .where(and(userFilter, eq(handovers.type, "delivery"))),

    // This month
    db
      .select({ value: count() })
      .from(handovers)
      .where(and(userFilter, gte(handovers.date, startOfMonth))),

    // Last month
    db
      .select({ value: count() })
      .from(handovers)
      .where(
        and(
          userFilter,
          gte(handovers.date, startOfLastMonth),
          sql`${handovers.date} < ${startOfMonth}`
        )
      ),

    // Average pass rate across completed handovers
    db
      .select({
        total: count(),
        passed: sql<number>`COUNT(*) FILTER (WHERE ${handoverChecks.checked} = true)`,
      })
      .from(handoverChecks)
      .innerJoin(handovers, eq(handoverChecks.handoverId, handovers.id))
      .where(and(userFilter, eq(handovers.status, "completed"))),

    // Tyre stats: total and run flat count
    db
      .select({
        total: count(),
        runFlat: sql<number>`COUNT(*) FILTER (WHERE ${tyreRecords.tyreType} = 'run_flat')`,
      })
      .from(tyreRecords)
      .innerJoin(handovers, eq(tyreRecords.handoverId, handovers.id))
      .where(userFilter),

    // Total photos
    db
      .select({ value: count() })
      .from(handoverPhotos)
      .innerJoin(handovers, eq(handoverPhotos.handoverId, handovers.id))
      .where(userFilter),

    // Damage photos
    db
      .select({ value: count() })
      .from(handoverPhotos)
      .innerJoin(handovers, eq(handoverPhotos.handoverId, handovers.id))
      .where(and(userFilter, eq(handoverPhotos.category, "damage"))),

    // Top 8 vehicle makes
    db
      .select({
        make: vehicles.make,
        total: count(),
      })
      .from(vehicles)
      .innerJoin(handovers, eq(handovers.vehicleId, vehicles.id))
      .where(userFilter)
      .groupBy(vehicles.make)
      .orderBy(desc(count()))
      .limit(8),

    // Monthly handovers (last 6 months)
    db
      .select({
        month: sql<string>`TO_CHAR(${handovers.date}, 'YYYY-MM')`,
        type: handovers.type,
        total: count(),
      })
      .from(handovers)
      .where(
        and(
          userFilter,
          gte(
            handovers.date,
            new Date(now.getFullYear(), now.getMonth() - 5, 1)
          )
        )
      )
      .groupBy(sql`TO_CHAR(${handovers.date}, 'YYYY-MM')`, handovers.type)
      .orderBy(sql`TO_CHAR(${handovers.date}, 'YYYY-MM')`),

    // Most failed checks (top 10, completed handovers only)
    db
      .select({
        checkItem: handoverChecks.checkItem,
        total: count(),
        fails: sql<number>`COUNT(*) FILTER (WHERE ${handoverChecks.checked} = false)`,
      })
      .from(handoverChecks)
      .innerJoin(handovers, eq(handoverChecks.handoverId, handovers.id))
      .where(and(userFilter, eq(handovers.status, "completed")))
      .groupBy(handoverChecks.checkItem)
      .orderBy(desc(sql`COUNT(*) FILTER (WHERE ${handoverChecks.checked} = false)`))
      .limit(10),

    // Handovers per inspector (admin only, top 5)
    isAdmin
      ? db
          .select({
            name: users.name,
            total: count(),
          })
          .from(handovers)
          .innerJoin(users, eq(handovers.userId, users.id))
          .groupBy(users.name)
          .orderBy(desc(count()))
          .limit(5)
      : Promise.resolve([]),
  ]);

  const passRate = passRateResult[0];
  const passPercentage =
    passRate.total > 0
      ? Math.round((passRate.passed / passRate.total) * 100)
      : 0;

  const tyreStat = tyreStatsResult[0];
  const runFlatPercentage =
    tyreStat.total > 0
      ? Math.round((tyreStat.runFlat / tyreStat.total) * 100)
      : 0;

  const thisMonth = thisMonthResult[0].value;
  const lastMonth = lastMonthResult[0].value;
  const monthTrend =
    lastMonth > 0
      ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
      : thisMonth > 0
        ? 100
        : 0;

  // Pivot monthly data into { month, collections, deliveries }
  const monthlyMap = new Map<
    string,
    { month: string; collections: number; deliveries: number }
  >();
  for (const row of monthlyResult) {
    if (!monthlyMap.has(row.month)) {
      monthlyMap.set(row.month, {
        month: row.month,
        collections: 0,
        deliveries: 0,
      });
    }
    const entry = monthlyMap.get(row.month)!;
    if (row.type === "delivery") {
      entry.deliveries = row.total;
    } else {
      entry.collections = row.total;
    }
  }

  return {
    collections: collectionsResult[0].value,
    deliveries: deliveriesResult[0].value,
    thisMonth,
    monthTrend,
    passPercentage,
    runFlatPercentage,
    totalTyres: tyreStat.total,
    totalPhotos: photoCountResult[0].value,
    damagePhotos: damagePhotoResult[0].value,
    topMakes: topMakesResult.map((r) => ({
      make: r.make,
      count: r.total,
    })),
    monthly: Array.from(monthlyMap.values()),
    failedChecks: failedChecksResult.map((r) => ({
      item:
        allLabels[r.checkItem as CheckItemKey | DeliveryCheckItemKey] ||
        r.checkItem,
      fails: r.fails,
      total: r.total,
      percentage: r.total > 0 ? Math.round((r.fails / r.total) * 100) : 0,
    })),
    inspectors: inspectorResult.map((r) => ({
      name: r.name,
      count: r.total,
    })),
    isAdmin,
  };
}

export async function getHandoverFilterOptions() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const isAdmin = session.user.role === "admin";
  const userFilter = isAdmin ? sql`1=1` : eq(handovers.userId, session.user.id);

  const [makesResult, modelsResult, inspectorsResult] = await Promise.all([
    db
      .selectDistinct({ make: vehicles.make })
      .from(vehicles)
      .innerJoin(handovers, eq(handovers.vehicleId, vehicles.id))
      .where(userFilter)
      .orderBy(asc(vehicles.make)),

    db
      .selectDistinct({ model: vehicles.model })
      .from(vehicles)
      .innerJoin(handovers, eq(handovers.vehicleId, vehicles.id))
      .where(userFilter)
      .orderBy(asc(vehicles.model)),

    isAdmin
      ? db
          .selectDistinct({ id: users.id, name: users.name })
          .from(users)
          .innerJoin(handovers, eq(handovers.userId, users.id))
          .orderBy(asc(users.name))
      : Promise.resolve([]),
  ]);

  return {
    makes: makesResult.map((r) => r.make),
    models: modelsResult.map((r) => r.model),
    inspectors: inspectorsResult.map((r) => ({ id: r.id, name: r.name })),
    isAdmin,
  };
}

export interface HandoverFilters {
  search?: string;
  make?: string;
  model?: string;
  status?: "draft" | "completed";
  type?: "collection" | "delivery";
  inspectorId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "date" | "make" | "registration" | "status" | "type";
  sortDir?: "asc" | "desc";
}

export async function listFilteredHandovers(
  filters: HandoverFilters = {},
  page = 1,
  pageSize = 20
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const isAdmin = session.user.role === "admin";
  const conditions: ReturnType<typeof eq>[] = [];

  if (!isAdmin) {
    conditions.push(eq(handovers.userId, session.user.id));
  }

  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(vehicles.make, pattern),
        ilike(vehicles.model, pattern),
        ilike(vehicles.registration, pattern)
      )!
    );
  }

  if (filters.make) {
    conditions.push(eq(vehicles.make, filters.make));
  }

  if (filters.model) {
    conditions.push(eq(vehicles.model, filters.model));
  }

  if (filters.status) {
    conditions.push(eq(handovers.status, filters.status));
  }

  if (filters.type) {
    conditions.push(eq(handovers.type, filters.type));
  }

  if (filters.inspectorId && isAdmin) {
    conditions.push(eq(handovers.userId, filters.inspectorId));
  }

  if (filters.dateFrom) {
    conditions.push(gte(handovers.date, new Date(filters.dateFrom)));
  }

  if (filters.dateTo) {
    const to = new Date(filters.dateTo);
    to.setHours(23, 59, 59, 999);
    conditions.push(lte(handovers.date, to));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn = (() => {
    switch (filters.sortBy) {
      case "make":
        return vehicles.make;
      case "registration":
        return vehicles.registration;
      case "status":
        return handovers.status;
      case "type":
        return handovers.type;
      default:
        return handovers.date;
    }
  })();

  const orderFn = filters.sortDir === "asc" ? asc : desc;

  const [totalResult, data] = await Promise.all([
    db
      .select({ value: count() })
      .from(handovers)
      .innerJoin(vehicles, eq(handovers.vehicleId, vehicles.id))
      .where(whereClause),

    db
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
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  return {
    data,
    total: totalResult[0].value,
    page,
    pageSize,
    totalPages: Math.ceil(totalResult[0].value / pageSize),
  };
}
