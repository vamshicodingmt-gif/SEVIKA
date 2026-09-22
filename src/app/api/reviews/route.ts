import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { reviewSchema } from "@/lib/validators";
import { notify } from "@/lib/notifications";
import { sendMail, emailShell, appLink } from "@/lib/mail";

export const dynamic = "force-dynamic";

/** POST: review an artist from a COMPLETED booking (one per booking). */
export const POST = route(async (req) => {
  const user = await requireUser();
  const data = await parseBody(req, reviewSchema);

  const booking = await db.booking.findUnique({
    where: { id: data.bookingId },
    include: {
      artist: { include: { user: { select: { id: true, email: true } } } },
      review: true,
    },
  });
  if (!booking || booking.customerId !== user.id) throw new ApiError(404, "Booking not found");
  if (booking.status !== "COMPLETED")
    throw new ApiError(400, "You can review a booking once it's completed");
  if (booking.review) throw new ApiError(409, "You already reviewed this booking");

  const review = await db.$transaction(async (tx) => {
    const r = await tx.review.create({
      data: {
        bookingId: booking.id,
        customerId: user.id,
        artistId: booking.artistId,
        rating: data.rating,
        comment: data.comment || null,
      },
    });
    // Recompute artist rating aggregates.
    const agg = await tx.review.aggregate({
      where: { artistId: booking.artistId, hidden: false },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await tx.artistProfile.update({
      where: { id: booking.artistId },
      data: {
        ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        ratingCount: agg._count.rating,
      },
    });
    return r;
  });

  await notify({
    userId: booking.artist.user.id,
    type: "REVIEW",
    title: `New ${data.rating}★ review from ${user.name}`,
    body: data.comment?.slice(0, 140) ?? "Tap to read and reply.",
    link: `/artists/${booking.artistId}`,
  });

  await sendMail({
    to: booking.artist.user.email,
    subject: `Sevika · You received a ${data.rating}★ review`,
    html: emailShell(
      `New ${data.rating}★ review`,
      `<p style="color:#52525b;font-size:14px;line-height:1.6;">${user.name} reviewed your service${data.comment ? `: “${data.comment}”` : "."} Reviews build your Sevika reputation — reply to say thanks!</p>
       <p style="margin:24px 0;"><a href="${appLink(`/artists/${booking.artistId}`)}" style="background:#e11d48;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:14px;">View review</a></p>`
    ),
  });

  return jsonOk({ review }, 201);
});
