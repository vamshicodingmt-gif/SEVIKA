import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { ticketReplySchema } from "@/lib/validators";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export const GET = route(async (_req, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const ticket = await db.supportTicket.findUnique({
    where: { id: ctx.params.id },
    include: {
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { id: true, name: true, role: true } } } },
    },
  });
  if (!ticket) throw new ApiError(404, "Ticket not found");
  const isOwner = ticket.userId === user.id;
  const isStaff = user.role === "ADMIN";
  if (!isOwner && !isStaff) throw new ApiError(404, "Ticket not found");
  return jsonOk({ ticket });
});

export const POST = route(async (req, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { body } = await parseBody(req, ticketReplySchema);

  const ticket = await db.supportTicket.findUnique({ where: { id: ctx.params.id } });
  if (!ticket) throw new ApiError(404, "Ticket not found");
  const isOwner = ticket.userId === user.id;
  const isStaff = user.role === "ADMIN";
  if (!isOwner && !isStaff) throw new ApiError(404, "Ticket not found");

  const message = await db.ticketMessage.create({
    data: {
      ticketId: ticket.id,
      senderId: user.id,
      body,
      isStaff,
    },
  });

  await db.supportTicket.update({
    where: { id: ticket.id },
    data: {
      status: isStaff ? "IN_PROGRESS" : "OPEN",
      ...(isStaff ? { assignedById: user.id } : {}),
    },
  });

  if (isStaff && !isOwner) {
    await notify({
      userId: ticket.userId,
      type: "ACCOUNT",
      title: "Sevika support replied",
      body: body.slice(0, 140),
      link: `/support?ticket=${ticket.id}`,
    });
  }

  return jsonOk({ message }, 201);
});
