"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/schema";
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
  input: { name?: string; role?: "admin" | "user"; password?: string }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Forbidden");
  }

  const updateData: Record<string, unknown> = {};
  if (input.name) updateData.name = input.name;
  if (input.role) updateData.role = input.role;
  if (input.password) updateData.passwordHash = await hash(input.password, 12);

  if (Object.keys(updateData).length === 0) return;

  await db.update(users).set(updateData).where(eq(users.id, userId));
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

  await db.delete(users).where(eq(users.id, userId));
  revalidatePath("/settings");
}
