import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { availabilityRulesSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

/** GET: the signed-in artist's working hours. */
export const GET = route(async () => {
  const user = await requireUser(["ARTIST"]);
  if (!user.artistProfileId) throw new ApiError(404, "Artist profile not found");
  const rules = await db.availabilityRule.findMany({
    where: { artistId: user.artistProfileId },
    orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
  });
  return jsonOk({ rules });
});

/** PUT: replace the artist's weekly working hours. */
export const PUT = route(async (req) => {
  const user = await requireUser(["ARTIST"]);
  if (!user.artistProfileId) throw new ApiError(404, "Artist profile not found");
  const { rules } = await parseBody(req, availabilityRulesSchema);

  await db.$transaction([
    db.availabilityRule.deleteMany({ where: { artistId: user.artistProfileId } }),
    db.availabilityRule.createMany({
      data: rules.map((r) => ({ ...r, artistId: user.artistProfileId! })),
    }),
  ]);

  const saved = await db.availabilityRule.findMany({
    where: { artistId: user.artistProfileId },
    orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
  });
  return jsonOk({ rules: saved });
});
