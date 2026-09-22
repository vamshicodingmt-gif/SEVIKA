import { db } from "@/lib/db";
import { jsonOk, requireUser, route } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireUser(["ADMIN"]);

  const [
    users,
    artists,
    customers,
    bookings,
    completedBookings,
    pendingBookings,
    reviews,
    openReports,
    openTickets,
    pendingVerifications,
    suspended,
  ] = await Promise.all([
    db.user.count(),
    db.artistProfile.count(),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.booking.count(),
    db.booking.count({ where: { status: "COMPLETED" } }),
    db.booking.count({ where: { status: "PENDING" } }),
    db.review.count(),
    db.report.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
    db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.verificationRequest.count({ where: { status: "PENDING" } }),
    db.user.count({ where: { suspended: true } }),
  ]);

  // 30-day trends
  const since = new Date(Date.now() - 30 * 24 * 3600_000);
  const [recentBookings, recentUsers] = await Promise.all([
    db.booking.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, status: true },
    }),
    db.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const days: Array<{ day: string; bookings: number; signups: number; completed: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600_000);
    days.push({ day: dayKey(d), bookings: 0, signups: 0, completed: 0 });
  }
  const index = new Map(days.map((d) => [d.day, d]));
  for (const b of recentBookings) {
    const row = index.get(dayKey(b.createdAt));
    if (row) {
      row.bookings++;
      if (b.status === "COMPLETED") row.completed++;
    }
  }
  for (const u of recentUsers) {
    const row = index.get(dayKey(u.createdAt));
    if (row) row.signups++;
  }

  // Category distribution from artist profiles
  const categoryRows = await db.$queryRaw<Array<{ category: string; count: bigint }>>`
    SELECT UNNEST(categories) AS category, COUNT(*) AS count
    FROM "ArtistProfile"
    GROUP BY 1 ORDER BY 2 DESC LIMIT 8
  `;

  const topArtists = await db.artistProfile.findMany({
    orderBy: [{ completedJobs: "desc" }, { ratingAvg: "desc" }],
    take: 5,
    select: {
      id: true,
      displayName: true,
      completedJobs: true,
      ratingAvg: true,
      ratingCount: true,
      city: true,
    },
  });

  return jsonOk({
    totals: {
      users,
      artists,
      customers,
      bookings,
      completedBookings,
      pendingBookings,
      reviews,
      openReports,
      openTickets,
      pendingVerifications,
      suspended,
    },
    trend: days,
    categories: categoryRows.map((r) => ({ category: r.category, count: Number(r.count) })),
    topArtists,
  });
});
