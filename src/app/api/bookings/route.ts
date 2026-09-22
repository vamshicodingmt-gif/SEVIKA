import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { bookingCreateSchema } from "@/lib/validators";
import { assertSlotFree, getArtistTotalDuration } from "@/lib/booking-service";
import { rateLimit } from "@/lib/ratelimit";
import { notify } from "@/lib/notifications";
import { sendMail, emailShell, appLink } from "@/lib/mail";
import { BRAND } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** GET: bookings for the signed-in customer or artist. */
export const GET = route(async (req) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const role = user.role === "ARTIST" ? "artist" : "customer";

  const where = {
    ...(role === "artist"
      ? { artistId: user.artistProfileId! }
      : { customerId: user.id }),
    ...(status && status !== "ALL" ? { status: status as never } : {}),
  };

  const bookings = await db.booking.findMany({
    where,
    orderBy: { scheduledAt: "desc" },
    take: 100,
    include: {
      services: true,
      customer: { select: { id: true, name: true, avatarUrl: true } },
      artist: {
        select: {
          id: true,
          displayName: true,
          user: { select: { avatarUrl: true } },
        },
      },
      review: { select: { id: true, rating: true } },
    },
  });

  return jsonOk({ bookings, role });
});

/**
 * POST: create a booking request. Always free — Sevika does not process
 * payments or charge any fees. Customers settle directly with the artist.
 */
export const POST = route(async (req) => {
  const user = await requireUser();
  if (user.role === "ADMIN") throw new ApiError(403, "Admins can't create bookings");
  if (user.role === "ARTIST") throw new ApiError(403, "Artists can't book other artists — use a customer account");

  const limit = await rateLimit("booking", user.id);
  if (!limit.success) throw new ApiError(429, "Too many booking requests — try again later");

  const data = await parseBody(req, bookingCreateSchema);

  const artist = await db.artistProfile.findUnique({
    where: { id: data.artistId },
    include: { user: { select: { id: true, suspended: true, email: true, name: true } } },
  });
  if (!artist || artist.user.suspended) throw new ApiError(404, "Artist not found");

  const scheduledAt = new Date(data.scheduledAt);
  if (scheduledAt.getTime() < Date.now() + 60 * 60_000) {
    throw new ApiError(400, "Pick a slot at least 1 hour from now");
  }

  const { services, durationMin } = await getArtistTotalDuration(data.serviceIds, data.artistId);
  await assertSlotFree(data.artistId, scheduledAt, durationMin);

  const booking = await db.booking.create({
    data: {
      customerId: user.id,
      artistId: data.artistId,
      type: data.type,
      status: "PENDING",
      scheduledAt,
      durationMin,
      locationType: data.locationType,
      addressLine: data.addressLine || null,
      city: data.city || artist.city || null,
      pincode: data.pincode || null,
      notes: data.notes || null,
      groupName: data.type === "GROUP_EVENT" ? data.groupName : null,
      headcount: data.type === "GROUP_EVENT" ? data.headcount : null,
      contactPhone: data.contactPhone || null,
      services: {
        create: services.map((s) => ({
          serviceId: s.id,
          name: s.name,
          priceAtBooking: s.priceFrom,
          durationMin: s.durationMin,
        })),
      },
      statusHistory: {
        create: { actorId: user.id, type: "CREATED", message: "Booking requested" },
      },
    },
    include: { services: true },
  });

  await notify({
    userId: artist.userId,
    type: "BOOKING",
    title: `New booking request from ${user.name}`,
    body:
      data.type === "GROUP_EVENT"
        ? `${data.groupName} · ${data.headcount} people · ${services.map((s) => s.name).join(", ")}`
        : services.map((s) => s.name).join(", "),
    link: `/bookings/${booking.id}`,
  });

  await sendMail({
    to: artist.user.email,
    subject: `Sevika · New booking request (${booking.code})`,
    html: emailShell(
      "New booking request",
      `<p style="color:#52525b;font-size:14px;line-height:1.6;"><strong>${user.name}</strong> requested <strong>${services
        .map((s) => s.name)
        .join(", ")}</strong> on ${scheduledAt.toUTCString().slice(0, 22)} UTC (your local time).</p>
       <p style="color:#52525b;font-size:14px;line-height:1.6;">Open Sevika to confirm or propose a new time.</p>
       <p style="margin:24px 0;"><a href="${appLink(`/bookings/${booking.id}`)}" style="background:#e11d48;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:14px;">Review request</a></p>`
    ),
  });

  await notify({
    userId: user.id,
    type: "BOOKING",
    title: "Booking request sent",
    body: `We asked ${artist.displayName} to confirm your ${formatWhen(scheduledAt)} appointment. You'll get a notification once they respond.`,
    link: `/bookings/${booking.id}`,
  });

  return jsonOk({ booking }, 201);
});

function formatWhen(d: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}
