import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Auth.js (NextAuth v4) catch-all route handler.
 * Serves /api/auth/signin, /api/auth/signout, /api/auth/callback/*,
 * /api/auth/session, /api/auth/csrf, /api/auth/providers.
 * Required for credential login to work — do not remove.
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
