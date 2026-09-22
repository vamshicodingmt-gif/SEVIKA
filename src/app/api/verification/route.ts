import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { verificationRequestSchema } from "@/lib/validators";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser(["ARTIST"]);
  if (!user.artistProfileId) throw new ApiError(404, "Artist profile not found");
  const request = await db.verificationRequest.findUnique({
    where: { artistId: user.artistProfileId },
  });
  return jsonOk({ request });
});

/** Artist submits (or re-submits) a verification request. */
export const POST = route(async (req) => {
  const user = await requireUser(["ARTIST"]);
  if (!user.artistProfileId) throw new ApiError(404, "Artist profile not found");
  const data = await parseBody(req, verificationRequestSchema);

  const certificateCount = await db.certificate.count({
    where: { artistId: user.artistProfileId },
  });
  if (certificateCount === 0) {
    throw new ApiError(400, "Upload at least one certificate before requesting verification");
  }

  const request = await db.verificationRequest.upsert({
    where: { artistId: user.artistProfileId },
    create: { artistId: user.artistProfileId, status: "PENDING", note: data.note || null },
    update: { status: "PENDING", note: data.note || null, reviewNote: null, reviewedById: null },
  });

  await db.artistProfile.update({
    where: { id: user.artistProfileId },
    data: { verificationStatus: "PENDING" },
  });

  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const admin of admins) {
    await notify({
      userId: admin.id,
      type: "VERIFICATION",
      title: "New verification request",
      body: `${user.name} submitted certificates for review.`,
      link: "/admin/verifications",
    });
  }

  await audit({
    actorId: user.id,
    actorEmail: user.email,
    action: "verification.request",
    targetType: "ARTIST_PROFILE",
    targetId: user.artistProfileId,
  });

  return jsonOk({ request }, 201);
});
