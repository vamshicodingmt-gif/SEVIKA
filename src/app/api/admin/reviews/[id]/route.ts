import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { reviewModerateSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** PATCH: hide/unhide a review (moderation). */
export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  const admin = await requireUser(["ADMIN"]);
  const { hidden } = await parseBody(req, reviewModerateSchema);

  const review = await db.review.findUnique({ where: { id: ctx.params.id } });
  if (!review) throw new ApiError(404, "Review not found");

  const updated = await db.$transaction(async (tx) => {
    const r = await tx.review.update({ where: { id: review.id }, data: { hidden } });
    const agg = await tx.review.aggregate({
      where: { artistId: review.artistId, hidden: false },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await tx.artistProfile.update({
      where: { id: review.artistId },
      data: {
        ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        ratingCount: agg._count.rating,
      },
    });
    return r;
  });

  await audit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: hidden ? "review.hide" : "review.unhide",
    targetType: "REVIEW",
    targetId: review.id,
  });
  return jsonOk({ review: updated });
});

export const DELETE = route(async (_req, ctx: { params: { id: string } }) => {
  const admin = await requireUser(["ADMIN"]);
  const review = await db.review.findUnique({ where: { id: ctx.params.id } });
  if (!review) throw new ApiError(404, "Review not found");

  await db.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: review.id } });
    const agg = await tx.review.aggregate({
      where: { artistId: review.artistId, hidden: false },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await tx.artistProfile.update({
      where: { id: review.artistId },
      data: {
        ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        ratingCount: agg._count.rating,
      },
    });
  });

  await audit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: "review.delete",
    targetType: "REVIEW",
    targetId: review.id,
  });
  return jsonOk({ ok: true });
});
