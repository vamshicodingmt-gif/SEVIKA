import { Prisma, type TicketStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonOk, requireUser, route } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireUser(["ADMIN"]);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const where: Prisma.SupportTicketWhereInput =
    status && status !== "ALL" ? { status: status as TicketStatus } : {};

  const tickets = await db.supportTicket.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  return jsonOk({ tickets });
});
