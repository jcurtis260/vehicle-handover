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
      canViewAllReports: users.canViewAllReports,
      canEditAllReports: users.canEditAllReports,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  if (!input.name || input.name.length > 255) throw new Error("Invalid name");
  if (!input.email || !EMAIL_REGEX.test(input.email) || input.email.length > 254)
    throw new Error("Invalid email");
  if (!input.password || input.password.length < 8 || input.password.length > 128)
    throw new Error("Password must be 8-128 characters");
  if (!["admin", "user"].includes(input.role))
    throw new Error("Invalid role");

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
    canViewAllReports?: boolean;
    canEditAllReports?: boolean;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Forbidden");
  }

  const [currentUser] = await db
    .select({
      canViewAllReports: users.canViewAllReports,
      canEditAllReports: users.canEditAllReports,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!currentUser) throw new Error("User not found");

  if (input.name !== undefined) {
    if (!input.name || input.name.length > 255) throw new Error("Invalid name");
    await db.update(users).set({ name: input.name }).where(eq(users.id, userId));
  }

  if (input.email !== undefined) {
    if (!input.email || !EMAIL_REGEX.test(input.email) || input.email.length > 254)
      throw new Error("Invalid email");
    await db
      .update(users)
      .set({ email: input.email.toLowerCase() })
      .where(eq(users.id, userId));
  }

  if (input.role !== undefined) {
    if (!["admin", "user"].includes(input.role)) throw new Error("Invalid role");
    await db.update(users).set({ role: input.role }).where(eq(users.id, userId));
  }

  if (input.password !== undefined) {
    if (input.password.length < 8 || input.password.length > 128)
      throw new Error("Password must be 8-128 characters");
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

  if (
    input.canViewAllReports !== undefined ||
    input.canEditAllReports !== undefined
  ) {
    let nextCanViewAllReports =
      input.canViewAllReports ?? currentUser.canViewAllReports;
    let nextCanEditAllReports =
      input.canEditAllReports ?? currentUser.canEditAllReports;

    // Mutually exclusive: either "view all (edit own)" OR "view+edit all".
    if (nextCanEditAllReports) {
      nextCanViewAllReports = false;
    } else if (nextCanViewAllReports) {
      nextCanEditAllReports = false;
    }

    await db
      .update(users)
      .set({
        canViewAllReports: nextCanViewAllReports,
        canEditAllReports: nextCanEditAllReports,
      })
      .where(eq(users.id, userId));
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
