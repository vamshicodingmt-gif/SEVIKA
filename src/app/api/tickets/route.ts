import { db } from "@/lib/db";
import { jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { ticketSchema } from "@/lib/validators";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  const tickets = await db.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return jsonOk({ tickets });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const data = await parseBody(req, ticketSchema);

  const ticket = await db.supportTicket.create({
    data: {
      userId: user.id,
      subject: data.subject,
      messages: {
        create: { senderId: user.id, body: data.message, isStaff: false },
      },
    },
    include: { messages: true },
  });

  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const admin of admins) {
    await notify({
      userId: admin.id,
      type: "ACCOUNT",
      title: "New support ticket",
      body: `${user.name}: ${data.subject}`,
      link: `/admin/tickets`,
    });
  }

  return jsonOk({ ticket }, 201);
});
