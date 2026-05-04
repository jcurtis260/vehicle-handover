"use server";

import { db } from "@/lib/db";
import { users, handovers, vehicles, handoverPhotos } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { compare, hash } from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  DEFAULT_PASSWORD_MAX_AGE_DAYS,
  MAX_PASSWORD_MAX_AGE_DAYS,
  MIN_PASSWORD_MAX_AGE_DAYS,
  normalizePasswordMaxAgeDays,
} from "@/lib/password-policy";

function isUndefinedColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeCode = (error as { code?: unknown }).code;
  if (maybeCode === "42703") return true;

  const maybeCauseCode = (
    error as { cause?: { code?: unknown } }
  ).cause?.code;
  if (maybeCauseCode === "42703") return true;

  const message =
    (error as { message?: string }).message ||
    (error as { cause?: { message?: string } }).cause?.message ||
    "";
  return /column .* does not exist/i.test(message);
}

export async function listUsers() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Forbidden");
  }

  try {
    return await db
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
        passwordChangedAt: users.passwordChangedAt,
        passwordMaxAgeDays: users.passwordMaxAgeDays,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);
  } catch (error) {
    if (!isUndefinedColumnError(error)) throw error;

    // Backward-compatible fallback for deployments where new permission columns
    // have not been applied yet. This keeps Settings usable instead of crashing.
    try {
      return await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          canEdit: sql<boolean>`false`,
          canDelete: sql<boolean>`false`,
          canViewChangelog: sql<boolean>`false`,
          canViewAllReports: sql<boolean>`false`,
          canEditAllReports: sql<boolean>`false`,
          passwordChangedAt: sql<Date | null>`NULL`,
          passwordMaxAgeDays: sql<number>`${DEFAULT_PASSWORD_MAX_AGE_DAYS}`,
          lastLoginAt: sql<Date | null>`NULL`,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(users.name);
    } catch {
      // Extra-safe minimal fallback for very old schemas.
      const minimalUsers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
        })
        .from(users)
        .orderBy(users.name);

      return minimalUsers.map((user) => ({
        ...user,
        canEdit: false,
        canDelete: false,
        canViewChangelog: false,
        canViewAllReports: false,
        canEditAllReports: false,
        passwordChangedAt: null,
        passwordMaxAgeDays: DEFAULT_PASSWORD_MAX_AGE_DAYS,
        lastLoginAt: null,
        createdAt: new Date(),
      }));
    }
  }
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

  const trimmedName = input.name.trim();
  const normalizedEmail = input.email.trim().toLowerCase();

  if (!trimmedName || trimmedName.length > 255) throw new Error("Invalid name");
  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail) || normalizedEmail.length > 254)
    throw new Error("Invalid email");
  if (!input.password || input.password.length < 8 || input.password.length > 128)
    throw new Error("Password must be 8-128 characters");
  if (!["admin", "user"].includes(input.role))
    throw new Error("Invalid role");

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("A user with this email already exists");
  }

  const passwordHash = await hash(input.password, 12);

  const [user] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      name: trimmedName,
      passwordHash,
      passwordChangedAt: new Date(),
      passwordMaxAgeDays: DEFAULT_PASSWORD_MAX_AGE_DAYS,
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
    passwordMaxAgeDays?: number;
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
    const trimmedName = input.name.trim();
    if (!trimmedName || trimmedName.length > 255) throw new Error("Invalid name");
    await db.update(users).set({ name: trimmedName }).where(eq(users.id, userId));
  }

  if (input.email !== undefined) {
    const normalizedEmail = input.email.trim().toLowerCase();
    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail) || normalizedEmail.length > 254)
      throw new Error("Invalid email");
    await db
      .update(users)
      .set({ email: normalizedEmail })
      .where(eq(users.id, userId));
  }

  if (input.role !== undefined) {
    if (!["admin", "user"].includes(input.role)) throw new Error("Invalid role");
    await db.update(users).set({ role: input.role }).where(eq(users.id, userId));
  }

  if (input.passwordMaxAgeDays !== undefined) {
    if (
      !Number.isInteger(input.passwordMaxAgeDays) ||
      input.passwordMaxAgeDays < MIN_PASSWORD_MAX_AGE_DAYS ||
      input.passwordMaxAgeDays > MAX_PASSWORD_MAX_AGE_DAYS
    ) {
      throw new Error(
        `Password expiry must be ${MIN_PASSWORD_MAX_AGE_DAYS}-${MAX_PASSWORD_MAX_AGE_DAYS} days`
      );
    }
    const normalized = normalizePasswordMaxAgeDays(input.passwordMaxAgeDays);
    await db
      .update(users)
      .set({ passwordMaxAgeDays: normalized })
      .where(eq(users.id, userId));
  }

  if (input.password !== undefined) {
    if (input.password.length < 8 || input.password.length > 128)
      throw new Error("Password must be 8-128 characters");
    const passwordHash = await hash(input.password, 12);
    await db
      .update(users)
      .set({ passwordHash, passwordChangedAt: new Date() })
      .where(eq(users.id, userId));
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

export async function changeOwnPassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Forbidden");
  }

  if (!input.currentPassword) throw new Error("Current password is required");
  if (!input.newPassword || input.newPassword.length < 8 || input.newPassword.length > 128) {
    throw new Error("New password must be 8-128 characters");
  }
  if (input.currentPassword === input.newPassword) {
    throw new Error("New password must be different from current password");
  }

  const [currentUser] = await db
    .select({
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!currentUser) throw new Error("User not found");

  const validCurrentPassword = await compare(
    input.currentPassword,
    currentUser.passwordHash
  );
  if (!validCurrentPassword) {
    throw new Error("Current password is incorrect");
  }

  const passwordHash = await hash(input.newPassword, 12);
  await db
    .update(users)
    .set({ passwordHash, passwordChangedAt: new Date() })
    .where(eq(users.id, session.user.id));

  revalidatePath("/password");
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
