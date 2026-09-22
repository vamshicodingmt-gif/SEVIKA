import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { blockedDateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser(["ARTIST"]);
  if (!user.artistProfileId) throw new ApiError(404, "Artist profile not found");
  const blocked = await db.blockedDate.findMany({
    where: { artistId: user.artistProfileId, date: { gte: new Date() } },
    orderBy: { date: "asc" },
  });
  return jsonOk({ blocked });
});

export const POST = route(async (req) => {
  const user = await requireUser(["ARTIST"]);
  if (!user.artistProfileId) throw new ApiError(404, "Artist profile not found");
  const data = await parseBody(req, blockedDateSchema);

  const [y, m, d] = data.date.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  const blocked = await db.blockedDate.upsert({
    where: { artistId_date: { artistId: user.artistProfileId, date } },
    create: { artistId: user.artistProfileId, date, note: data.note || null },
    update: { note: data.note || null },
  });
  return jsonOk({ blocked }, 201);
});

export const DELETE = route(async (req) => {
  const user = await requireUser(["ARTIST"]);
  if (!user.artistProfileId) throw new ApiError(404, "Artist profile not found");
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) throw new ApiError(400, "Missing id");

  const blocked = await db.blockedDate.findUnique({ where: { id } });
  if (!blocked || blocked.artistId !== user.artistProfileId) throw new ApiError(404, "Blocked date not found");

  await db.blockedDate.delete({ where: { id } });
  return jsonOk({ ok: true });
});
