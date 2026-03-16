import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";
import { db } from "./db";
import { users } from "./schema";
import { and, eq, sql } from "drizzle-orm";

const LAST_LOGIN_TOUCH_INTERVAL_MINUTES = 10;

export async function touchUserLastLogin(userId: string) {
  if (!userId) return;

  try {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(
        and(
          eq(users.id, userId),
          sql`(${users.lastLoginAt} IS NULL OR ${users.lastLoginAt} < NOW() - (${LAST_LOGIN_TOUCH_INTERVAL_MINUTES} * INTERVAL '1 minute'))`
        )
      );
  } catch (err) {
    // Never block request flow on activity timestamp write failures.
    console.error("[Auth] Failed to touch lastLoginAt:", err);
  }
}

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  await touchUserLastLogin(session.user.id);
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "admin") redirect("/dashboard");
  return session;
}
