import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { servicePatchSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

async function assertOwnService(id: string, artistProfileId: string | null) {
  if (!artistProfileId) throw new ApiError(404, "Artist profile not found");
  const service = await db.service.findUnique({ where: { id } });
  if (!service || service.artistId !== artistProfileId) throw new ApiError(404, "Service not found");
  return service;
}

export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  const user = await requireUser(["ARTIST"]);
  await assertOwnService(ctx.params.id, user.artistProfileId);
  const data = await parseBody(req, servicePatchSchema);

  const service = await db.service.update({
    where: { id: ctx.params.id },
    data: { ...data, description: data.description === "" ? null : data.description },
  });
  return jsonOk({ service });
});

export const DELETE = route(async (_req, ctx: { params: { id: string } }) => {
  const user = await requireUser(["ARTIST"]);
  await assertOwnService(ctx.params.id, user.artistProfileId);
  await db.service.delete({ where: { id: ctx.params.id } });
  return jsonOk({ ok: true });
});
