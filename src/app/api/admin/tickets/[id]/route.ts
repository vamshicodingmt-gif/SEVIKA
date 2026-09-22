import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { ticketStatusSchema } from "@/lib/validators";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  const admin = await requireUser(["ADMIN"]);
  const { status } = await parseBody(req, ticketStatusSchema);

  const ticket = await db.supportTicket.findUnique({ where: { id: ctx.params.id } });
  if (!ticket) throw new ApiError(404, "Ticket not found");

  const updated = await db.supportTicket.update({
    where: { id: ticket.id },
    data: { status, assignedById: admin.id },
  });

  await notify({
    userId: ticket.userId,
    type: "ACCOUNT",
    title: `Ticket ${ticket.code} → ${status.replaceAll("_", " ").toLowerCase()}`,
    link: `/support?ticket=${ticket.id}`,
  });

  return jsonOk({ ticket: updated });
});
