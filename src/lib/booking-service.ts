import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-helpers";
import { computeSlots, type BusyInterval, type WorkingRule } from "@/lib/slots";

/**
 * Booking domain logic shared by the API routes.
 * Sevika bookings are always FREE to create — there is no payment step,
 * no fee and no commission anywhere in this flow.
 */

export const HOLDING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "RESCHEDULE_REQUESTED",
] as const;

export async function getArtistBusyIntervals(
  artistId: string,
  from: Date,
  to: Date,
  excludeBookingId?: string
): Promise<BusyInterval[]> {
  const bookings = await db.booking.findMany({
    where: {
      artistId,
      scheduledAt: { gte: from, lt: to },
      status: { in: [...HOLDING_STATUSES] },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { id: true, scheduledAt: true, durationMin: true },
  });
  return bookings.map((b) => ({
    start: b.scheduledAt,
    end: new Date(b.scheduledAt.getTime() + b.durationMin * 60_000),
  }));
}

export async function getArtistRules(artistId: string): Promise<WorkingRule[]> {
  const rules = await db.availabilityRule.findMany({
    where: { artistId },
    select: { weekday: true, startMinute: true, endMinute: true },
  });
  return rules;
}

export async function getBlockedDates(artistId: string, from: Date, to: Date) {
  return db.blockedDate.findMany({
    where: { artistId, date: { gte: from, lte: to } },
    select: { date: true },
  });
}

export async function assertSlotFree(
  artistId: string,
  scheduledAt: Date,
  durationMin: number,
  excludeBookingId?: string
) {
  const dayStart = new Date(
    Date.UTC(scheduledAt.getUTCFullYear(), scheduledAt.getUTCMonth(), scheduledAt.getUTCDate())
  );
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600_000);

  const [rules, blocked, busy] = await Promise.all([
    getArtistRules(artistId),
    getBlockedDates(artistId, dayStart, dayEnd),
    getArtistBusyIntervals(artistId, dayStart, dayEnd, excludeBookingId),
  ]);

  const slots = computeSlots({
    date: dayStart,
    durationMin,
    rules,
    blockedDates: blocked.map((b) => b.date),
    busy: busy.filter((b) => b.end.getTime() !== scheduledAt.getTime()),
    now: new Date(Date.now() - 24 * 3600_000), // don't re-apply lead time on server
    slotStepMin: 15,
  });

  const wanted = scheduledAt.toISOString();
  const matchesSlot = slots.some((s) => {
    const t = new Date(s).getTime();
    return Math.abs(t - scheduledAt.getTime()) < 60_000;
  });

  if (!matchesSlot) {
    throw new ApiError(
      409,
      "That time is no longer available. Pick another slot from the artist's calendar."
    );
  }
  return { dayStart, busy };
}

export async function getArtistTotalDuration(serviceIds: string[], artistId: string) {
  const services = await db.service.findMany({
    where: { id: { in: serviceIds }, artistId, isActive: true },
  });
  if (services.length !== serviceIds.length) {
    throw new ApiError(400, "One or more selected services are unavailable");
  }
  const durationMin = services.reduce((sum, s) => sum + s.durationMin, 0);
  if (durationMin <= 0 || durationMin > 600) {
    throw new ApiError(400, "Combined service duration must be between 15 minutes and 10 hours");
  }
  return { services, durationMin };
}
