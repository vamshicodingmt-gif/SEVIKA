import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, route } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

/**
 * POST: lets the sign-in page distinguish "invalid credentials" from
 * "account suspended" (NextAuth v4 masks authorize errors as generic
 * credential failures). Reveals nothing beyond suspension state.
 */
export const POST = route(async (req) => {
  const { email } = await parseBody(req, schema);

  const limit = await rateLimit("auth", email);
  if (!limit.success) throw new ApiError(429, "Too many attempts — try again in a few minutes");

  const user = await db.user.findUnique({
    where: { email },
    select: { suspended: true, suspensionReason: true },
  });

  return jsonOk({
    exists: Boolean(user),
    suspended: Boolean(user?.suspended),
    reason: user?.suspended ? user.suspensionReason : null,
  });
});
