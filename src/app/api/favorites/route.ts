import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { favoriteSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  const favorites = await db.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      artist: {
        include: { user: { select: { avatarUrl: true, suspended: true } } },
      },
    },
  });

  return jsonOk({
    favorites: favorites
      .filter((f) => !f.artist.user.suspended)
      .map((f) => ({
        id: f.artist.id,
        displayName: f.artist.displayName,
        tagline: f.artist.tagline,
        city: f.artist.city,
        avatarUrl: f.artist.user.avatarUrl,
        coverUrl: f.artist.coverUrl,
        verificationStatus: f.artist.verificationStatus,
        onlineStatus: f.artist.onlineStatus,
        ratingAvg: f.artist.ratingAvg,
        ratingCount: f.artist.ratingCount,
        completedJobs: f.artist.completedJobs,
        yearsExperience: f.artist.yearsExperience,
        categories: f.artist.categories,
        favoritedAt: f.createdAt,
      })),
  });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const { artistId } = await parseBody(req, favoriteSchema);

  const artist = await db.artistProfile.findUnique({ where: { id: artistId } });
  if (!artist) throw new ApiError(404, "Artist not found");

  await db.favorite.upsert({
    where: { userId_artistId: { userId: user.id, artistId } },
    create: { userId: user.id, artistId },
    update: {},
  });
  return jsonOk({ favorited: true }, 201);
});

export const DELETE = route(async (req) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const artistId = url.searchParams.get("artistId");
  if (!artistId) throw new ApiError(400, "artistId is required");

  await db.favorite.deleteMany({ where: { userId: user.id, artistId } });
  return jsonOk({ favorited: false });
});
