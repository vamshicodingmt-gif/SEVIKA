import { NextResponse } from "next/server";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** Wrap a route handler with uniform error handling. */
export function route<Args extends unknown[]>(
  fn: (req: Request, ...args: Args) => Promise<Response>
) {
  return async (req: Request, ...args: Args): Promise<Response> => {
    try {
      return await fn(req, ...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return NextResponse.json(
          { error: first?.message ?? "Invalid input", issues: err.issues },
          { status: 400 }
        );
      }
      console.error("[api]", err);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

export async function parseBody<T>(req: Request, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  return parsed.data;
}

export interface AuthedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  suspended: boolean;
  artistProfileId: string | null;
}

/** Session user hydrated from the DB (suspension/role changes apply instantly). */
export async function requireUser(roles?: Array<Role>): Promise<AuthedUser> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) throw new ApiError(401, "Please sign in to continue");

  const user = await db.user.findUnique({
    where: { id },
    include: { artistProfile: { select: { id: true } } },
  });
  if (!user) throw new ApiError(401, "Session expired — please sign in again");
  if (user.suspended) {
    throw new ApiError(403, "Your account is suspended. Contact support@sevika.app");
  }
  if (roles && !roles.includes(user.role)) {
    throw new ApiError(403, "You don't have permission to do that");
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    suspended: user.suspended,
    artistProfileId: user.artistProfile?.id ?? null,
  };
}

export async function optionalUser(): Promise<AuthedUser | null> {
  try {
    return await requireUser();
  } catch {
    return null;
  }
}

/** Parse URLSearchParams with a zod schema (for GET endpoints). */
export function parseQuery<T>(req: Request, schema: ZodType<T, ZodTypeDef, unknown>): T {
  const url = new URL(req.url);
  const raw: Record<string, string | boolean> = {};
  url.searchParams.forEach((value, key) => {
    if (value === "true" || value === "false") raw[key] = value === "true";
    else raw[key] = value;
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid query");
  }
  return parsed.data;
}
