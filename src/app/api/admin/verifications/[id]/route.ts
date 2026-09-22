import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { verificationReviewSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { sendMail, emailShell, appLink } from "@/lib/mail";

export const dynamic = "force-dynamic";

/** PATCH: approve or reject an artist verification request. */
export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  const admin = await requireUser(["ADMIN"]);
  const { status, reviewNote } = await parseBody(req, verificationReviewSchema);

  const request = await db.verificationRequest.findUnique({
    where: { id: ctx.params.id },
    include: { artist: { include: { user: { select: { id: true, email: true } } } } },
  });
  if (!request) throw new ApiError(404, "Verification request not found");
  if (request.status !== "PENDING") throw new ApiError(400, "This request was already reviewed");

  const [updated, artist] = await db.$transaction(async (tx) => {
    const u = await tx.verificationRequest.update({
      where: { id: request.id },
      data: {
        status,
        reviewNote: reviewNote || null,
        reviewedById: admin.id,
      },
    });
    const a = await tx.artistProfile.update({
      where: { id: request.artistId },
      data: { verificationStatus: status },
    });
    return [u, a];
  });

  await audit({
    actorId: admin.id,
    actorEmail: admin.email,
    action: `verification.${status.toLowerCase()}`,
    targetType: "ARTIST_PROFILE",
    targetId: request.artistId,
    meta: { note: reviewNote ?? null },
  });

  await notify({
    userId: request.artist.user.id,
    type: "VERIFICATION",
    title: status === "VERIFIED" ? "You're verified 🎉" : "Verification not approved",
    body:
      status === "VERIFIED"
        ? "Your profile now shows the Verified by Sevika badge."
        : reviewNote || "Review your certificates and try again.",
    link: "/artist/certificates",
  });

  await sendMail({
    to: request.artist.user.email,
    subject: `Sevika · Verification ${status === "VERIFIED" ? "approved" : "update"}`,
    html: emailShell(
      status === "VERIFIED" ? "You're verified 🎉" : "Verification update",
      `<p style="color:#52525b;font-size:14px;line-height:1.6;">${
        status === "VERIFIED"
          ? "Congratulations — your Sevika profile now displays the Verified badge, which builds customer trust."
          : `Your verification request wasn't approved this time. ${reviewNote ? `Reviewer note: ${reviewNote}` : ""} You can update your certificates and re-apply.`
      }</p>
       <p style="margin:24px 0;"><a href="${appLink("/artist/certificates")}" style="background:#e11d48;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:14px;">Open certificates</a></p>`
    ),
  });

  return jsonOk({ request: updated, artistId: artist.id });
});
