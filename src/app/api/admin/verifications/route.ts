import { db } from "@/lib/db";
import { jsonOk, requireUser, route } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireUser(["ADMIN"]);
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "PENDING";

  const requests = await db.verificationRequest.findMany({
    where: { status: status as never },
    orderBy: { createdAt: "asc" },
    include: {
      artist: {
        include: {
          user: { select: { name: true, email: true, avatarUrl: true, city: true, suspended: true } },
          certificates: { orderBy: { createdAt: "desc" } },
        },
      },
      reviewedBy: { select: { name: true } },
    },
  });

  return jsonOk({ requests });
});
