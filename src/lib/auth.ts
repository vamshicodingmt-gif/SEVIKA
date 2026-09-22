import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validators";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email & password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          include: { artistProfile: { select: { id: true } } },
        });
        if (!user?.passwordHash) return null;

        const ok = await compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        if (user.suspended) {
          throw new Error(
            "Your account has been suspended. Contact Sevika support at support@sevika.app."
          );
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
          role: user.role,
          artistProfileId: user.artistProfile?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "CUSTOMER";
        token.artistProfileId = user.artistProfileId ?? null;
        token.suspended = false;
      } else if (trigger === "update" && token.id) {
        // Re-hydrate role/suspension on demand (e.g. after admin action).
        const fresh = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            suspended: true,
            artistProfile: { select: { id: true } },
          },
        });
        if (fresh) {
          token.role = fresh.role;
          token.suspended = fresh.suspended;
          token.artistProfileId = fresh.artistProfile?.id ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role ?? "CUSTOMER";
        session.user.artistProfileId = token.artistProfileId ?? null;
      }
      return session;
    },
  },
};
