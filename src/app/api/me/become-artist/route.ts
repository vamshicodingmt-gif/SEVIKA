import { db } from "@/lib/db";
import { ApiError, jsonOk, requireUser, route } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** POST: a customer upgrades their account to an artist. Free, no commission. */
export const POST = route(async () => {
  const user = await requireUser();
  if (user.role === "ARTIST") throw new ApiError(400, "You're already an artist");
  if (user.role === "ADMIN") throw new ApiError(400, "Admins manage the platform, not bookings");

  const updated = await db.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: user.id },
      data: {
        role: "ARTIST",
        artistProfile: {
          create: {
            displayName: user.name,
            city: null,
            onlineStatus: "OFFLINE",
          },
        },
      },
      include: { artistProfile: true },
    });
    return u;
  });

  await audit({
    actorId: user.id,
    actorEmail: user.email,
    action: "user.became_artist",
    targetType: "USER",
    targetId: user.id,
  });

  return jsonOk({
    user: { id: updated.id, role: updated.role },
    artistProfileId: updated.artistProfile?.id ?? null,
  });
});
