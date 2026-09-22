import { db } from "@/lib/db";
import { ApiError, jsonOk, optionalUser, route } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = route(async (_req, ctx: { params: { id: string } }) => {
  const { id } = ctx.params;

  const profile = await db.artistProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, suspended: true, name: true, avatarUrl: true, createdAt: true },
      },
      services: {
        where: { isActive: true },
        orderBy: { priceFrom: "asc" },
      },
      portfolio: {
        where: { moderationStatus: { not: "REJECTED" } },
        orderBy: { createdAt: "desc" },
        take: 24,
      },
      reviews: {
        where: { hidden: false },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { customer: { select: { id: true, name: true, avatarUrl: true } } },
      },
      _count: { select: { portfolio: true, reviews: true, services: true } },
    },
  });

  if (!profile || profile.user.suspended) throw new ApiError(404, "Artist not found");

  // Profile views (not counting the artist's own visits)
  const viewer = await optionalUser();
  if (viewer?.id !== profile.userId) {
    await db.artistProfile.update({ where: { id }, data: { profileViews: { increment: 1 } } }).catch(() => {});
  }

  const favorited = viewer
    ? Boolean(
        await db.favorite.findUnique({
          where: { userId_artistId: { userId: viewer.id, artistId: id } },
        })
      )
    : false;

  const certificates = await db.certificate.findMany({
    where: { artistId: id, status: "VERIFIED" },
    select: { title: true, issuer: true, status: true },
  });

  return jsonOk({
    artist: {
      id: profile.id,
      userId: profile.userId,
      displayName: profile.displayName,
      tagline: profile.tagline,
      bio: profile.bio,
      city: profile.city,
      serviceArea: profile.serviceArea,
      addressLine: profile.addressLine,
      lat: profile.lat,
      lng: profile.lng,
      onlineStatus: profile.onlineStatus,
      verificationStatus: profile.verificationStatus,
      yearsExperience: profile.yearsExperience,
      categories: profile.categories,
      specialties: profile.specialties,
      languages: profile.languages,
      coverUrl: profile.coverUrl,
      avatarUrl: profile.user.avatarUrl,
      joinedAt: profile.user.createdAt,
      profileViews: profile.profileViews,
      completedJobs: profile.completedJobs,
      ratingAvg: profile.ratingAvg,
      ratingCount: profile.ratingCount,
    },
    services: profile.services,
    portfolio: profile.portfolio,
    reviews: profile.reviews,
    verifiedCertificates: certificates,
    totals: profile._count,
    favorited,
  });
});
