import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { portfolioSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser(["ARTIST"]);
  if (!user.artistProfileId) throw new ApiError(404, "Artist profile not found");
  const items = await db.portfolioItem.findMany({
    where: { artistId: user.artistProfileId },
    orderBy: { createdAt: "desc" },
  });
  return jsonOk({ items });
});

export const POST = route(async (req) => {
  const user = await requireUser(["ARTIST"]);
  if (!user.artistProfileId) throw new ApiError(404, "Artist profile not found");
  const data = await parseBody(req, portfolioSchema);

  const count = await db.portfolioItem.count({ where: { artistId: user.artistProfileId } });
  if (count >= 60) throw new ApiError(400, "Portfolio limit reached (60 items)");

  const item = await db.portfolioItem.create({
    data: {
      artistId: user.artistProfileId,
      type: data.type,
      url: data.url,
      thumbUrl: data.thumbUrl ?? null,
      title: data.title || null,
      category: data.category || null,
      // New uploads await a quick moderation pass.
      moderationStatus: "PENDING",
    },
  });
  return jsonOk({ item }, 201);
});
