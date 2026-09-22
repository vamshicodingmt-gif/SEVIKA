import { Prisma, type Role } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonOk, requireUser, route } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireUser(["ADMIN"]);
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const role = url.searchParams.get("role") as Role | null;
  const status = url.searchParams.get("status"); // "suspended" | "active"
  const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
  const pageSize = 20;

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(status === "suspended" ? { suspended: true } : status === "active" ? { suspended: false } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        city: true,
        suspended: true,
        suspensionReason: true,
        createdAt: true,
        artistProfile: { select: { id: true, displayName: true, verificationStatus: true, completedJobs: true } },
        _count: { select: { bookingsAsCustomer: true, reviews: true } },
      },
    }),
  ]);

  return jsonOk({ users, total, page, pageSize });
});
