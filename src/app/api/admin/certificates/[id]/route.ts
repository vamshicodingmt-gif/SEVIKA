import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { certificateModerateSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/** PATCH: verify / reject an individual certificate. */
export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  const admin = await requireUser(["ADMIN"]);
  const { status } = await parseBody(req, certificateModerateSchema);

  const cert = await db.certificate.findUnique({
    where: { id: ctx.params.id },
    include: { artist: { include: { user: { select: { id: true } } } } },
  });
  if (!cert) throw new ApiError(404, "Certificate not found");

  const updated = await db.certificate.update({ where: { id: cert.id }, data: { status } });

  await audit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: `certificate.${status.toLowerCase()}`,
    targetType: "CERTIFICATE",
    targetId: cert.id,
  });
  await notify({
    userId: cert.artist.user.id,
    type: "VERIFICATION",
    title: status === "VERIFIED" ? `Certificate verified: ${cert.title}` : `Certificate needs attention: ${cert.title}`,
    link: "/artist/certificates",
  });

  return jsonOk({ certificate: updated });
});
