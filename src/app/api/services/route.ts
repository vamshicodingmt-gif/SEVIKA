import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { serviceSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** GET: the signed-in artist's services (all, incl. hidden). */
export const GET = route(async () => {
  const user = await requireUser(["ARTIST"]);
  if (!user.artistProfileId) throw new ApiError(404, "Artist profile not found");
  const services = await db.service.findMany({
    where: { artistId: user.artistProfileId },
    orderBy: [{ category: "asc" }, { priceFrom: "asc" }],
  });
  return jsonOk({ services });
});

export const POST = route(async (req) => {
  const user = await requireUser(["ARTIST"]);
  if (!user.artistProfileId) throw new ApiError(404, "Artist profile not found");
  const data = await parseBody(req, serviceSchema);

  const count = await db.service.count({ where: { artistId: user.artistProfileId } });
  if (count >= 50) throw new ApiError(400, "Service limit reached (50). Remove unused services first.");

  const service = await db.service.create({
    data: { ...data, description: data.description || null, artistId: user.artistProfileId },
  });
  await audit({
    actorId: user.id,
    actorEmail: user.email,
    action: "service.create",
    targetType: "SERVICE",
    targetId: service.id,
  });
  return jsonOk({ service }, 201);
});
