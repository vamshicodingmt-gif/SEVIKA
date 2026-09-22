import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonOk, requireUser, route } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireUser(["ADMIN"]);
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter"); // hidden | reported | all
  const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
  const pageSize = 20;

  const where: Prisma.ReviewWhereInput =
    filter === "hidden" ? { hidden: true } : filter === "visible" ? { hidden: false } : {};

  const [total, reviews] = await Promise.all([
    db.review.count({ where }),
    db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        artist: { select: { id: true, displayName: true } },
      },
    }),
  ]);

  return jsonOk({ reviews, total, page, pageSize });
});
