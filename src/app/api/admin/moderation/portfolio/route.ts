import { db } from "@/lib/db";
import { jsonOk, requireUser, route } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireUser(["ADMIN"]);
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "PENDING";

  const items = await db.portfolioItem.findMany({
    where: status === "ALL" ? {} : { moderationStatus: status as never },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { artist: { select: { displayName: true } } },
  });
  return jsonOk({ items });
});
