import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { bookingActionSchema, rescheduleSchema } from "@/lib/validators";
import { assertSlotFree } from "@/lib/booking-service";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { sendMail, emailShell, appLink } from "@/lib/mail";
import { formatBookingTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function loadBooking(id: string) {
  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      services: true,
      statusHistory: { orderBy: { createdAt: "desc" }, take: 20 },
      customer: { select: { id: true, name: true, email: true, avatarUrl: true, phone: true } },
      artist: {
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      },
      review: true,
    },
  });
  if (!booking) throw new ApiError(404, "Booking not found");
  return booking;
}

export const GET = route(async (_req, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const booking = await loadBooking(ctx.params.id);

  const isCustomer = booking.customerId === user.id;
  const isArtist = user.role === "ARTIST" && booking.artistId === user.artistProfileId;
  const isAdmin = user.role === "ADMIN";
  if (!isCustomer && !isArtist && !isAdmin) throw new ApiError(404, "Booking not found");

  return jsonOk({
    booking,
    viewer: isCustomer ? "CUSTOMER" : isArtist ? "ARTIST" : "ADMIN",
  });
});

/**
 * PATCH: lifecycle actions.
 * Transitions (Sevika never touches money in any of these):
 *   PENDING ──confirm──▶ CONFIRMED ──start──▶ IN_PROGRESS ──complete──▶ COMPLETED
 *   PENDING ──decline──▶ DECLINED
 *   PENDING|CONFIRMED ──cancel──▶ CANCELLED
 *   PENDING|CONFIRMED ──propose reschedule──▶ RESCHEDULE_REQUESTED ──accept/decline──▶ back
 */
export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { id } = ctx.params;
  const booking = await loadBooking(id);

  const isCustomer = booking.customerId === user.id;
  const isArtist = user.role === "ARTIST" && booking.artistId === user.artistProfileId;
  if (!isCustomer && !isArtist) throw new ApiError(404, "Booking not found");

  const { action, reason, proposedAt } = await parseBody(req, bookingActionSchema);
  const otherUserId = isCustomer ? booking.artist.userId : booking.customerId;
  const otherLink = `/bookings/${booking.id}`;
  const actorLabel = isCustomer ? booking.customer.name : booking.artist.displayName;

  let data: Record<string, unknown> = {};
  let eventType: string = action;
  let notifyTitle = "";
  let notifyBody = "";

  switch (action) {
    case "CONFIRM": {
      if (!isArtist || booking.status !== "PENDING")
        throw new ApiError(400, "Only the artist can confirm a pending request");
      await assertSlotFree(booking.artistId, booking.scheduledAt, booking.durationMin, booking.id);
      data = { status: "CONFIRMED" };
      notifyTitle = "Booking confirmed ✅";
      notifyBody = `${booking.artist.displayName} confirmed your appointment on ${formatBookingTime(booking.scheduledAt, { withDate: true })}. ${"Payment arrangements are made directly between the customer and professional."}`;
      break;
    }
    case "DECLINE": {
      if (!isArtist || booking.status !== "PENDING")
        throw new ApiError(400, "Only the artist can decline a pending request");
      data = { status: "DECLINED", cancelledById: user.id, cancelReason: reason || null };
      notifyTitle = "Booking declined";
      notifyBody = `${booking.artist.displayName} can't take this appointment.${reason ? ` Reason: ${reason}` : ""}`;
      break;
    }
    case "START": {
      if (!isArtist || booking.status !== "CONFIRMED")
        throw new ApiError(400, "Only a confirmed booking can be started");
      data = { status: "IN_PROGRESS" };
      notifyTitle = "Your session has started";
      notifyBody = `${booking.artist.displayName} marked your appointment as in progress.`;
      break;
    }
    case "COMPLETE": {
      if (!isArtist || booking.status !== "IN_PROGRESS")
        throw new ApiError(400, "Only an in-progress booking can be completed");
      data = { status: "COMPLETED" };
      notifyTitle = "Service completed 🎉";
      notifyBody = `Hope you loved it! Rate ${booking.artist.displayName} to help others on Sevika.`;
      break;
    }
    case "CANCEL": {
      if (!["PENDING", "CONFIRMED", "RESCHEDULE_REQUESTED"].includes(booking.status))
        throw new ApiError(400, "This booking can no longer be cancelled");
      data = {
        status: "CANCELLED",
        cancelledById: user.id,
        cancelReason: reason || null,
        proposedAt: null,
        rescheduleRequestedBy: null,
        preRescheduleStatus: null,
      };
      notifyTitle = "Booking cancelled";
      notifyBody = `${actorLabel} cancelled the appointment on ${formatBookingTime(booking.scheduledAt, { withDate: true })}.${reason ? ` Reason: ${reason}` : ""}`;
      break;
    }
    case "PROPOSE_RESCHEDULE": {
      if (!["PENDING", "CONFIRMED"].includes(booking.status))
        throw new ApiError(400, "This booking can't be rescheduled right now");
      if (!proposedAt) throw new ApiError(400, "proposedAt is required");
      const when = new Date(proposedAt);
      if (when.getTime() < Date.now() + 60 * 60_000)
        throw new ApiError(400, "Pick a time at least 1 hour from now");
      await assertSlotFree(booking.artistId, when, booking.durationMin, booking.id);
      data = {
        status: "RESCHEDULE_REQUESTED",
        proposedAt: when,
        rescheduleRequestedBy: isCustomer ? "CUSTOMER" : "ARTIST",
        preRescheduleStatus: booking.status,
      };
      eventType = "RESCHEDULE_PROPOSED";
      notifyTitle = "Reschedule requested";
      notifyBody = `${actorLabel} proposed ${formatBookingTime(when, { withDate: true })} instead of ${formatBookingTime(booking.scheduledAt, { withDate: true })}.`;
      break;
    }
    case "ACCEPT_RESCHEDULE": {
      if (booking.status !== "RESCHEDULE_REQUESTED" || !booking.proposedAt)
        throw new ApiError(400, "There is no pending reschedule proposal");
      const proposer = booking.rescheduleRequestedBy;
      if ((isCustomer && proposer === "CUSTOMER") || (isArtist && proposer === "ARTIST"))
        throw new ApiError(400, "Wait for the other party to respond to your proposal");
      await assertSlotFree(booking.artistId, booking.proposedAt, booking.durationMin, booking.id);
      data = {
        status: booking.preRescheduleStatus ?? "CONFIRMED",
        scheduledAt: booking.proposedAt,
        proposedAt: null,
        rescheduleRequestedBy: null,
        preRescheduleStatus: null,
      };
      eventType = "RESCHEDULE_ACCEPTED";
      notifyTitle = "Reschedule accepted ✅";
      notifyBody = `${actorLabel} accepted the new time: ${formatBookingTime(booking.proposedAt, { withDate: true })}.`;
      break;
    }
    case "DECLINE_RESCHEDULE": {
      if (booking.status !== "RESCHEDULE_REQUESTED")
        throw new ApiError(400, "There is no pending reschedule proposal");
      const proposer = booking.rescheduleRequestedBy;
      if ((isCustomer && proposer === "CUSTOMER") || (isArtist && proposer === "ARTIST"))
        throw new ApiError(400, "Wait for the other party to respond to your proposal");
      data = {
        status: booking.preRescheduleStatus ?? "PENDING",
        proposedAt: null,
        rescheduleRequestedBy: null,
        preRescheduleStatus: null,
      };
      eventType = "RESCHEDULE_DECLINED";
      notifyTitle = "Reschedule declined";
      notifyBody = `${actorLabel} kept the original time: ${formatBookingTime(booking.scheduledAt, { withDate: true })}.`;
      break;
    }
    default:
      throw new ApiError(400, "Unknown action");
  }

  const updated = await db.$transaction(async (tx) => {
    const b = await tx.booking.update({ where: { id }, data, include: { services: true } });
    await tx.bookingEvent.create({
      data: {
        bookingId: id,
        actorId: user.id,
        type: eventType,
        message:
          action === "CANCEL"
            ? reason || undefined
            : action === "PROPOSE_RESCHEDULE" && proposedAt
              ? `Proposed ${formatBookingTime(new Date(proposedAt), { withDate: true })}`
              : undefined,
      },
    });
    // Keep completed-jobs counter in sync.
    if (action === "COMPLETE") {
      await tx.artistProfile.update({
        where: { id: b.artistId },
        data: { completedJobs: { increment: 1 } },
      });
    }
    return b;
  });

  await notify({ userId: otherUserId, type: "BOOKING_UPDATE", title: notifyTitle, body: notifyBody, link: otherLink });

  const recipient = isCustomer ? booking.artist.user.email : booking.customer.email;
  await sendMail({
    to: recipient,
    subject: `Sevika · ${notifyTitle} (${booking.code})`,
    html: emailShell(
      notifyTitle,
      `<p style="color:#52525b;font-size:14px;line-height:1.6;">${notifyBody}</p>
       <p style="margin:24px 0;"><a href="${appLink(otherLink)}" style="background:#e11d48;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:14px;">View booking</a></p>`
    ),
  });

  if (user.role === "ADMIN" || action === "CANCEL" || action === "DECLINE") {
    await audit({
      actorId: user.id,
      actorEmail: user.email,
      action: `booking.${action.toLowerCase()}`,
      targetType: "BOOKING",
      targetId: booking.id,
      meta: { reason: reason || null },
    });
  }

  return jsonOk({ booking: updated });
});

/** POST: reschedule proposal from the dedicated dialog (same as PATCH action). */
export const POST = route(async (req, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const booking = await loadBooking(ctx.params.id);
  const isCustomer = booking.customerId === user.id;
  const isArtist = user.role === "ARTIST" && booking.artistId === user.artistProfileId;
  if (!isCustomer && !isArtist) throw new ApiError(404, "Booking not found");

  const { proposedAt } = await parseBody(req, rescheduleSchema);
  const when = new Date(proposedAt);
  if (when.getTime() < Date.now() + 60 * 60_000)
    throw new ApiError(400, "Pick a time at least 1 hour from now");
  await assertSlotFree(booking.artistId, when, booking.durationMin, booking.id);

  const updated = await db.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "RESCHEDULE_REQUESTED",
        proposedAt: when,
        rescheduleRequestedBy: isCustomer ? "CUSTOMER" : "ARTIST",
        preRescheduleStatus: booking.status,
      },
    });
    await tx.bookingEvent.create({
      data: {
        bookingId: booking.id,
        actorId: user.id,
        type: "RESCHEDULE_PROPOSED",
        message: `Proposed ${formatBookingTime(when, { withDate: true })}`,
      },
    });
    return b;
  });

  await notify({
    userId: isCustomer ? booking.artist.userId : booking.customerId,
    type: "BOOKING_UPDATE",
    title: "Reschedule requested",
    body: `${user.name} proposed ${formatBookingTime(when, { withDate: true })}.`,
    link: `/bookings/${booking.id}`,
  });

  return jsonOk({ booking: updated });
});
