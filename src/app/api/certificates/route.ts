import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { certificateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser(["ARTIST"]);
  if (!user.artistProfileId) throw new ApiError(404, "Artist profile not found");
  const certificates = await db.certificate.findMany({
    where: { artistId: user.artistProfileId },
    orderBy: { createdAt: "desc" },
  });
  return jsonOk({ certificates });
});

export const POST = route(async (req) => {
  const user = await requireUser(["ARTIST"]);
  if (!user.artistProfileId) throw new ApiError(404, "Artist profile not found");
  const data = await parseBody(req, certificateSchema);

  const certificate = await db.certificate.create({
    data: {
      artistId: user.artistProfileId,
      title: data.title,
      issuer: data.issuer || null,
      fileUrl: data.fileUrl,
      status: "PENDING",
    },
  });
  return jsonOk({ certificate }, 201);
});

export const DELETE = route(async (req) => {
  const user = await requireUser(["ARTIST"]);
  if (!user.artistProfileId) throw new ApiError(404, "Artist profile not found");
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) throw new ApiError(400, "Missing id");

  const cert = await db.certificate.findUnique({ where: { id } });
  if (!cert || cert.artistId !== user.artistProfileId) throw new ApiError(404, "Certificate not found");

  await db.certificate.delete({ where: { id } });
  return jsonOk({ ok: true });
});
