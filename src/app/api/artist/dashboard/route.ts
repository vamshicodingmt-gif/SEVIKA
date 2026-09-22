import { db } from "@/lib/db";
import { ApiError, jsonOk, requireUser, route } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser(["ARTIST"]);
  if (!user.artistProfileId) throw new ApiError(404, "Artist profile not found");
  const artistId = user.artistProfileId;

  const [profile, serviceCount, portfolioCount, certificates, upcoming, pastBookings] =
    await Promise.all([
      db.artistProfile.findUniqueOrThrow({
        where: { id: artistId },
        select: {
          displayName: true,
          city: true,
          completedJobs: true,
          ratingAvg: true,
          ratingCount: true,
          profileViews: true,
          verificationStatus: true,
          onlineStatus: true,
        },
      }),
      db.service.count({ where: { artistId } }),
      db.portfolioItem.count({ where: { artistId } }),
      db.certificate.findMany({
        where: { artistId },
        select: { status: true },
      }),
      db.booking.findMany({
        where: {
          artistId,
          status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS", "RESCHEDULE_REQUESTED"] },
        },
        orderBy: { scheduledAt: "asc" },
        take: 6,
        include: {
          customer: { select: { name: true } },
          services: { select: { name: true } },
        },
      }),
      db.booking.findMany({
        where: { artistId, createdAt: { gte: new Date(Date.now() - 56 * 24 * 3600_000) } },
        select: { createdAt: true },
      }),
    ]);

  // Weekly booking counts (8 weeks)
  const weekly: Array<{ day: string; count: number }> = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now.getTime() - i * 7 * 24 * 3600_000);
    weekly.push({
      day: start.toISOString().slice(0, 10),
      count: 0,
    });
  }
  for (const b of pastBookings) {
    const weeksAgo = Math.floor((now.getTime() - b.createdAt.getTime()) / (7 * 24 * 3600_000));
    const idx = 7 - weeksAgo;
    if (idx >= 0 && idx < weekly.length) weekly[idx].count++;
  }

  return jsonOk({
    profile,
    counts: {
      services: serviceCount,
      portfolio: portfolioCount,
      certificates: certificates.length,
      pendingCertificates: certificates.filter((c) => c.status === "PENDING").length,
    },
    upcoming,
    weekly,
  });
});
