import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { adminUserPatchSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  const admin = await requireUser(["ADMIN"]);
  const data = await parseBody(req, adminUserPatchSchema);
  const { id } = ctx.params;

  const target = await db.user.findUnique({ where: { id } });
  if (!target) throw new ApiError(404, "User not found");
  if (target.id === admin.id && data.suspended) throw new ApiError(400, "You can't suspend yourself");
  if (target.role === "ADMIN" && data.suspended) throw new ApiError(400, "Admins can't suspend other admins");

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(data.suspended !== undefined
        ? { suspended: data.suspended, suspensionReason: data.suspended ? data.suspensionReason || null : null }
        : {}),
      ...(data.role ? { role: data.role } : {}),
    },
  });

  await audit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: data.suspended === true ? "user.suspend" : data.suspended === false ? "user.restore" : "user.update",
    targetType: "USER",
    targetId: id,
    meta: { role: data.role ?? null, reason: data.suspensionReason ?? null },
  });

  if (data.suspended === true) {
    await notify({
      userId: id,
      type: "ACCOUNT",
      title: "Account suspended",
      body: data.suspensionReason
        ? `Reason: ${data.suspensionReason}. Contact support@sevika.app`
        : "Contact support@sevika.app if you think this is a mistake.",
    });
  } else if (data.suspended === false) {
    await notify({
      userId: id,
      type: "ACCOUNT",
      title: "Account restored 🎉",
      body: "Your Sevika account is active again. Welcome back!",
    });
  }

  return jsonOk({
    user: { id: updated.id, suspended: updated.suspended, role: updated.role },
  });
});
