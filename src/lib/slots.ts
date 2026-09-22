/**
 * Sevika booking slot engine.
 *
 * All datetimes use the "artist wall clock as UTC" convention: a slot on
 * 25 Sep at 10:30 in the artist's city is stored as 2026-09-25T10:30:00Z and
 * rendered with timeZone: "UTC" everywhere. This keeps the engine pure and
 * deterministic (unit-tested) without per-user timezone ambiguity.
 */

export interface WorkingRule {
  weekday: number; // 0 = Sunday … 6 = Saturday
  startMinute: number; // minutes from midnight
  endMinute: number;
}

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface SlotComputationInput {
  /** Midnight UTC of the calendar day being offered (Y-M-D of the wall clock). */
  date: Date;
  durationMin: number;
  rules: WorkingRule[];
  /** Fully blocked days (Y-M-D at midnight UTC). */
  blockedDates: Date[];
  /** Existing holds: PENDING / CONFIRMED / IN_PROGRESS / proposed reschedules. */
  busy: BusyInterval[];
  now?: Date;
  slotStepMin?: number;
  /** Minimum notice before a slot may start (minutes). */
  minLeadMinutes?: number;
}

const MIN = 60_000;

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function minutesSinceDayStart(d: Date, dayStart: Date): number {
  return Math.round((d.getTime() - dayStart.getTime()) / MIN);
}

/** Merge overlapping/adjacent [start,end) minute ranges. */
export function mergeRanges(ranges: Array<[number, number]>): Array<[number, number]> {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out: Array<[number, number]> = [[...sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    if (cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
    else out.push([...cur]);
  }
  return out;
}

/** Subtract `busy` ranges from `available` ranges. */
export function subtractRanges(
  available: Array<[number, number]>,
  busy: Array<[number, number]>
): Array<[number, number]> {
  let free = available.map((r) => [...r] as [number, number]);
  for (const [bStart, bEnd] of mergeRanges(busy)) {
    const next: Array<[number, number]> = [];
    for (const [aStart, aEnd] of free) {
      if (bEnd <= aStart || bStart >= aEnd) {
        next.push([aStart, aEnd]); // no overlap
        continue;
      }
      if (bStart > aStart) next.push([aStart, Math.min(bStart, aEnd)]);
      if (bEnd < aEnd) next.push([Math.max(bEnd, aStart), aEnd]);
    }
    free = next;
  }
  return free;
}

/**
 * Compute bookable start times for a day.
 * Returns ISO UTC strings sorted ascending.
 */
export function computeSlots(input: SlotComputationInput): string[] {
  const {
    date,
    durationMin,
    rules,
    blockedDates,
    busy,
    now = new Date(),
    slotStepMin = 30,
    minLeadMinutes = 60,
  } = input;

  const dayStart = startOfUtcDay(date);
  const weekday = dayStart.getUTCDay();

  if (blockedDates.some((b) => dayKey(b) === dayKey(dayStart))) return [];

  const dayRules = rules.filter((r) => r.weekday === weekday);
  if (dayRules.length === 0 || durationMin <= 0) return [];

  const available = mergeRanges(
    dayRules.map((r) => [r.startMinute, r.endMinute] as [number, number])
  );

  // Busy intervals clamped to this day's minute coordinate space.
  const busyMinutes: Array<[number, number]> = busy
    .map((b) => [minutesSinceDayStart(b.start, dayStart), minutesSinceDayStart(b.end, dayStart)] as [number, number])
    .filter(([, end]) => end > 0)
    .map(([start, end]) => [Math.max(start, 0), end] as [number, number]);

  const free = subtractRanges(available, busyMinutes);

  // Earliest allowed start, considering lead time.
  const nowMinutes = minutesSinceDayStart(now, dayStart);
  const earliest = now.getTime() < dayStart.getTime()
    ? 0
    : nowMinutes + minLeadMinutes;

  const slots: string[] = [];
  for (const [start, end] of free) {
    const lastStart = end - durationMin;
    let t = Math.ceil(start / slotStepMin) * slotStepMin;
    while (t <= lastStart) {
      if (t >= earliest) {
        slots.push(new Date(dayStart.getTime() + t * MIN).toISOString());
      }
      t += slotStepMin;
    }
  }
  return slots.sort();
}
