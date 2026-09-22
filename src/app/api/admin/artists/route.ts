import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonOk, requireUser, route } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireUser(["ADMIN"]);
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const verification = url.searchParams.get("verification");
  const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
  const pageSize = 20;

  const where: Prisma.ArtistProfileWhereInput = {
    ...(verification && verification !== "ALL" ? { verificationStatus: verification as never } : {}),
    ...(q
      ? {
          OR: [
            { displayName: { contains: q, mode: "insensitive" } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, artists] = await Promise.all([
    db.artistProfile.count({ where }),
    db.artistProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, email: true, suspended: true, createdAt: true } },
        _count: { select: { services: true, portfolio: true, reviews: true, bookingsAsArtist: true } },
      },
    }),
  ]);

  return jsonOk({ artists, total, page, pageSize });
});
