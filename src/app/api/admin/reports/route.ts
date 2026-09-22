import { db } from "@/lib/db";
import { jsonOk, requireUser, route } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireUser(["ADMIN"]);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const reports = await db.report.findMany({
    where: status && status !== "ALL" ? { status: status as never } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { name: true } },
    },
  });

  // Attach lightweight target context for the moderation UI.
  const enriched = await Promise.all(
    reports.map(async (r) => {
      let context: Record<string, unknown> = {};
      try {
        if (r.targetType === "REVIEW") {
          const review = await db.review.findUnique({
            where: { id: r.targetId },
            select: { rating: true, comment: true, artist: { select: { displayName: true } } },
          });
          context = { kind: "review", review };
        } else if (r.targetType === "PORTFOLIO") {
          const item = await db.portfolioItem.findUnique({
            where: { id: r.targetId },
            select: { url: true, title: true, artist: { select: { displayName: true } } },
          });
          context = { kind: "portfolio", item };
        } else if (r.targetType === "ARTIST_PROFILE") {
          const artist = await db.artistProfile.findUnique({
            where: { id: r.targetId },
            select: { displayName: true, bio: true },
          });
          context = { kind: "artist", artist };
        } else {
          const user = await db.user.findUnique({
            where: { id: r.targetId },
            select: { name: true, email: true, role: true },
          });
          context = { kind: "user", user };
        }
      } catch {
        context = {};
      }
      return { ...r, context };
    })
  );

  return jsonOk({ reports: enriched });
});
