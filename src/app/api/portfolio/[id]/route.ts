import { db } from "@/lib/db";
import { ApiError, jsonOk, requireUser, route } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const DELETE = route(async (_req, ctx: { params: { id: string } }) => {
  const user = await requireUser(["ARTIST"]);
  if (!user.artistProfileId) throw new ApiError(404, "Artist profile not found");

  const item = await db.portfolioItem.findUnique({ where: { id: ctx.params.id } });
  if (!item || item.artistId !== user.artistProfileId) throw new ApiError(404, "Portfolio item not found");

  await db.portfolioItem.delete({ where: { id: item.id } });
  return jsonOk({ ok: true });
});
