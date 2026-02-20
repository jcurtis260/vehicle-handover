import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

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
            console.log("[Auth] No user found for:", credentials.email);
            return null;
          }

          const valid = await compare(credentials.password, user.passwordHash);
          if (!valid) {
            console.log("[Auth] Invalid password for:", credentials.email);
            return null;
          }

          db.update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.id, user.id))
            .then(() => {})
            .catch((err) => console.error("[Auth] Failed to update lastLoginAt:", err));

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            canEdit: user.canEdit,
            canDelete: user.canDelete,
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
        const u = user as unknown as { role: string; canEdit: boolean; canDelete: boolean };
        token.role = u.role;
        token.canEdit = u.canEdit;
        token.canDelete = u.canDelete;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.canEdit = token.canEdit as boolean;
        session.user.canDelete = token.canDelete as boolean;
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
