import { db } from "@/lib/db";
import { jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { reportSchema } from "@/lib/validators";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** POST: report a user / artist profile / review / portfolio item. */
export const POST = route(async (req) => {
  const user = await requireUser();
  const data = await parseBody(req, reportSchema);

  const report = await db.report.create({
    data: {
      reporterId: user.id,
      targetType: data.targetType,
      targetId: data.targetId,
      reason: data.reason,
      details: data.details || null,
    },
  });

  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const admin of admins) {
    await notify({
      userId: admin.id,
      type: "ACCOUNT",
      title: `New report: ${data.reason}`,
      body: `${data.targetType} reported by ${user.name}.`,
      link: "/admin/reports",
    });
  }

  await audit({
    actorId: user.id,
    actorEmail: user.email,
    action: "report.create",
    targetType: data.targetType,
    targetId: data.targetId,
  });

  return jsonOk({ report }, 201);
});
