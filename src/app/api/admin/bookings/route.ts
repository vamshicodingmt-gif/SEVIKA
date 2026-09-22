import { Prisma, type BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonOk, requireUser, route } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireUser(["ADMIN"]);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q")?.trim();
  const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
  const pageSize = 20;

  const where: Prisma.BookingWhereInput = {
    ...(status && status !== "ALL" ? { status: status as BookingStatus } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
            { customer: { email: { contains: q, mode: "insensitive" } } },
            { artist: { displayName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, bookings] = await Promise.all([
    db.booking.count({ where }),
    db.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        artist: { select: { id: true, displayName: true } },
        services: true,
      },
    }),
  ]);

  return jsonOk({ bookings, total, page, pageSize });
});
