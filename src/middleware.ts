import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Edge middleware — coarse route protection.
 * Fine-grained role checks also happen in server layouts and API routes.
 */

const ARTIST_PREFIX = "/artist";
const ADMIN_PREFIX = "/admin";
const AUTHED_PREFIXES = ["/bookings", "/messages", "/account", "/favorites", "/notifications", "/support"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const needsAuth =
    pathname.startsWith(ARTIST_PREFIX) ||
    pathname.startsWith(ADMIN_PREFIX) ||
    AUTHED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!needsAuth) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith(ADMIN_PREFIX) && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith(ARTIST_PREFIX) && token.role !== "ARTIST") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/artist/:path*",
    "/admin/:path*",
    "/bookings/:path*",
    "/messages/:path*",
    "/account/:path*",
    "/favorites/:path*",
    "/notifications/:path*",
    "/support/:path*",
  ],
};
