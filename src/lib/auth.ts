import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import {
  DEFAULT_PASSWORD_MAX_AGE_DAYS,
  isPasswordExpired,
  normalizePasswordMaxAgeDays,
} from "./password-policy";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email.toLowerCase()))
            .limit(1);

          if (!user) {
            console.log("[Auth] Login failed");
            return null;
          }

          const valid = await compare(credentials.password, user.passwordHash);
          if (!valid) {
            console.log("[Auth] Login failed");
            return null;
          }

          try {
            await db
              .update(users)
              .set({ lastLoginAt: new Date() })
              .where(eq(users.id, user.id));
          } catch (err) {
            // Don't block sign-in if activity tracking write fails.
            console.error("[Auth] Failed to update lastLoginAt:", err);
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            canEdit: user.canEdit,
            canDelete: user.canDelete,
            canViewChangelog: user.canViewChangelog,
            canViewAllReports: user.canViewAllReports,
            canEditAllReports: user.canEditAllReports,
            passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null,
            passwordMaxAgeDays: normalizePasswordMaxAgeDays(
              user.passwordMaxAgeDays
            ),
            passwordExpired: isPasswordExpired(
              user.passwordChangedAt,
              user.passwordMaxAgeDays
            ),
          };
        } catch (error) {
          console.error("[Auth] Error during authorization:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const u = user as unknown as {
          role: string;
          canEdit: boolean;
          canDelete: boolean;
          canViewChangelog: boolean;
          canViewAllReports: boolean;
          canEditAllReports: boolean;
          passwordChangedAt: string | null;
          passwordMaxAgeDays: number;
          passwordExpired: boolean;
        };
        token.role = u.role;
        token.canEdit = u.canEdit;
        token.canDelete = u.canDelete;
        token.canViewChangelog = u.canViewChangelog;
        token.canViewAllReports = u.canViewAllReports;
        token.canEditAllReports = u.canEditAllReports;
        token.passwordChangedAt = u.passwordChangedAt;
        token.passwordMaxAgeDays = u.passwordMaxAgeDays;
        token.passwordExpired = u.passwordExpired;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.canEdit = token.canEdit as boolean;
        session.user.canDelete = token.canDelete as boolean;
        session.user.canViewChangelog = token.canViewChangelog as boolean;
        session.user.canViewAllReports = token.canViewAllReports as boolean;
        session.user.canEditAllReports = token.canEditAllReports as boolean;
        session.user.passwordChangedAt =
          (token.passwordChangedAt as string | null) ?? null;
        session.user.passwordMaxAgeDays =
          (token.passwordMaxAgeDays as number | undefined) ??
          DEFAULT_PASSWORD_MAX_AGE_DAYS;
        session.user.passwordExpired = Boolean(token.passwordExpired);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
};
