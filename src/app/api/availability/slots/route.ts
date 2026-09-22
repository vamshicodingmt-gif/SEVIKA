import { db } from "@/lib/db";
import { ApiError, jsonOk, route } from "@/lib/api-helpers";
import { computeSlots, startOfUtcDay } from "@/lib/slots";
import { getArtistBusyIntervals, getArtistRules, getBlockedDates } from "@/lib/booking-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability/slots?artistId=…&date=YYYY-MM-DD&durationMin=90
 * Public endpoint — powers the customer booking calendar.
 */
export const GET = route(async (req) => {
  const url = new URL(req.url);
  const artistId = url.searchParams.get("artistId");
  const dateStr = url.searchParams.get("date");
  const durationMin = Number(url.searchParams.get("durationMin") ?? 60);

  if (!artistId || !dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new ApiError(400, "artistId and date (YYYY-MM-DD) are required");
  }
  if (!Number.isFinite(durationMin) || durationMin < 15 || durationMin > 600) {
    throw new ApiError(400, "durationMin must be between 15 and 600");
  }

  const artist = await db.artistProfile.findUnique({
    where: { id: artistId },
    select: { id: true, user: { select: { suspended: true } } },
  });
  if (!artist || artist.user.suspended) throw new ApiError(404, "Artist not found");

  const [y, m, d] = dateStr.split("-").map(Number);
  const dayStart = new Date(Date.UTC(y, m - 1, d));
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600_000);

  const [rules, blocked, busy] = await Promise.all([
    getArtistRules(artistId),
    getBlockedDates(artistId, dayStart, dayEnd),
    getArtistBusyIntervals(artistId, dayStart, dayEnd),
  ]);

  const slots = computeSlots({
    date: startOfUtcDay(dayStart),
    durationMin,
    rules,
    blockedDates: blocked.map((b) => b.date),
    busy,
    now: new Date(),
    slotStepMin: 30,
    minLeadMinutes: 120,
  });

  return jsonOk({
    date: dateStr,
    durationMin,
    slots,
    closed: rules.length === 0,
  });
});
