import { db } from "@/lib/db";
import { ApiError, jsonOk, parseQuery, route } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = route(async (req, ctx: { params: { id: string } }) => {
  const artistId = ctx.params.id;
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const take = Math.min(Number(url.searchParams.get("take") ?? 10), 30);

  const artist = await db.artistProfile.findUnique({ where: { id: artistId }, select: { id: true } });
  if (!artist) throw new ApiError(404, "Artist not found");

  const reviews = await db.review.findMany({
    where: { artistId, hidden: false },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { customer: { select: { id: true, name: true, avatarUrl: true } } },
  });

  const hasMore = reviews.length > take;
  return jsonOk({
    reviews: hasMore ? reviews.slice(0, take) : reviews,
    nextCursor: hasMore ? reviews[take - 1].id : null,
  });
});
