import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { portfolioModerateSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  const admin = await requireUser(["ADMIN"]);
  const { moderationStatus } = await parseBody(req, portfolioModerateSchema);

  const item = await db.portfolioItem.findUnique({ where: { id: ctx.params.id } });
  if (!item) throw new ApiError(404, "Portfolio item not found");

  const updated = await db.portfolioItem.update({
    where: { id: item.id },
    data: { moderationStatus },
  });

  await audit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: `portfolio.${moderationStatus.toLowerCase()}`,
    targetType: "PORTFOLIO",
    targetId: item.id,
  });

  return jsonOk({ item: updated });
});
