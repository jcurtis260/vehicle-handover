"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { touchUserLastLogin } from "@/lib/auth-helpers";
import type { UiPreferences } from "@/lib/ui-preferences";
import {
  mergeHandoverListColumnPrefs,
  defaultVisibleHandoverListColumns,
  type HandoverListColumnId,
} from "@/lib/handovers-list-columns";

export async function getHandoverListColumnPreferences(): Promise<
  HandoverListColumnId[]
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return defaultVisibleHandoverListColumns();

  const [row] = await db
    .select({ uiPreferences: users.uiPreferences })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const prefs = row?.uiPreferences as UiPreferences | null | undefined;
  return mergeHandoverListColumnPrefs(prefs?.allHandoversVisibleColumns);
}

export async function saveHandoverListColumnPreferences(
  visibleColumnIds: string[]
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  await touchUserLastLogin(session.user.id);

  const merged = mergeHandoverListColumnPrefs(visibleColumnIds);
  if (merged.length === 0) {
    throw new Error("At least one column must be visible");
  }

  const [existing] = await db
    .select({ uiPreferences: users.uiPreferences })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const prev = (existing?.uiPreferences as UiPreferences | null) || {};
  const next: UiPreferences = {
    ...prev,
    allHandoversVisibleColumns: merged,
  };

  await db
    .update(users)
    .set({ uiPreferences: next })
    .where(eq(users.id, session.user.id));
}
