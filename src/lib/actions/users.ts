"use server";

import { db } from "@/lib/db";
import { users, handovers, vehicles, handoverPhotos } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function listUsers() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Forbidden");
  }

  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      canEdit: users.canEdit,
      canDelete: users.canDelete,
      canViewChangelog: users.canViewChangelog,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);
}

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role: "admin" | "user";
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Forbidden");
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("A user with this email already exists");
  }

  const passwordHash = await hash(input.password, 12);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash,
      role: input.role,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    });

  revalidatePath("/settings");
  return user;
}

export async function updateUser(
  userId: string,
  input: {
    name?: string;
    email?: string;
    role?: "admin" | "user";
    password?: string;
    canEdit?: boolean;
    canDelete?: boolean;
    canViewChangelog?: boolean;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Forbidden");
  }

  if (input.name) {
    await db.update(users).set({ name: input.name }).where(eq(users.id, userId));
  }

  if (input.email) {
    await db
      .update(users)
      .set({ email: input.email.toLowerCase() })
      .where(eq(users.id, userId));
  }

  if (input.role) {
    await db.update(users).set({ role: input.role }).where(eq(users.id, userId));
  }

  if (input.password) {
    const passwordHash = await hash(input.password, 12);
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  }

  if (input.canEdit !== undefined) {
    await db.update(users).set({ canEdit: input.canEdit }).where(eq(users.id, userId));
  }

  if (input.canDelete !== undefined) {
    await db.update(users).set({ canDelete: input.canDelete }).where(eq(users.id, userId));
  }

  if (input.canViewChangelog !== undefined) {
    await db.update(users).set({ canViewChangelog: input.canViewChangelog }).where(eq(users.id, userId));
  }

  revalidatePath("/settings");
}

export async function deleteUser(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Forbidden");
  }

  if (userId === session.user.id) {
    throw new Error("Cannot delete your own account");
  }

  const userHandovers = await db
    .select({ id: handovers.id })
    .from(handovers)
    .where(eq(handovers.userId, userId));

  if (userHandovers.length > 0) {
    for (const h of userHandovers) {
      const photos = await db
        .select({ blobUrl: handoverPhotos.blobUrl })
        .from(handoverPhotos)
        .where(eq(handoverPhotos.handoverId, h.id));

      if (photos.length > 0) {
        try {
          const { del } = await import("@vercel/blob");
          await del(photos.map((p) => p.blobUrl));
        } catch (err) {
          console.error("[DeleteUser] Failed to delete blob files:", err);
        }
      }
    }

    // Handovers cascade-delete checks, tyres, and photo DB records
    for (const h of userHandovers) {
      await db.delete(handovers).where(eq(handovers.id, h.id));
    }
  }

  // Only delete vehicles created by this user that aren't referenced by
  // other users' handovers (safe approach to avoid FK violations)
  const userVehicles = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.createdBy, userId));

  for (const v of userVehicles) {
    const refs = await db
      .select({ id: handovers.id })
      .from(handovers)
      .where(eq(handovers.vehicleId, v.id))
      .limit(1);

    if (refs.length === 0) {
      await db.delete(vehicles).where(eq(vehicles.id, v.id));
    } else {
      // Vehicle still referenced by other handovers -- reassign to the admin
      await db
        .update(vehicles)
        .set({ createdBy: session.user.id })
        .where(eq(vehicles.id, v.id));
    }
  }

  await db.delete(users).where(eq(users.id, userId));
  revalidatePath("/settings");
}
