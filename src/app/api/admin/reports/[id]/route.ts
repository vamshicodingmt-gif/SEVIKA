import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { reportResolveSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  const admin = await requireUser(["ADMIN"]);
  const data = await parseBody(req, reportResolveSchema);

  const report = await db.report.findUnique({ where: { id: ctx.params.id } });
  if (!report) throw new ApiError(404, "Report not found");

  const updated = await db.report.update({
    where: { id: report.id },
    data: {
      status: data.status,
      resolution: data.resolution || null,
      resolvedById: admin.id,
    },
  });

  await audit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: `report.${data.status.toLowerCase()}`,
    targetType: "REPORT",
    targetId: report.id,
    meta: { target: report.targetType, resolution: data.resolution ?? null },
  });

  return jsonOk({ report: updated });
});
