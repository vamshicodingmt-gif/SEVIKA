import { describe, expect, it } from "vitest";
import {
  computeSlots,
  mergeRanges,
  startOfUtcDay,
  subtractRanges,
  type BusyInterval,
  type WorkingRule,
} from "@/lib/slots";

const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

const businessRules: WorkingRule[] = [
  { weekday: 1, startMinute: 10 * 60, endMinute: 19 * 60 }, // Mon 10:00–19:00
];

describe("mergeRanges", () => {
  it("sorts and merges overlapping ranges", () => {
    expect(
      mergeRanges([
        [600, 700],
        [500, 620],
        [700, 720],
      ])
    ).toEqual([[500, 720]]);
  });

  it("keeps disjoint ranges apart", () => {
    expect(
      mergeRanges([
        [0, 100],
        [200, 300],
      ])
    ).toEqual([
      [0, 100],
      [200, 300],
    ]);
  });
});

describe("subtractRanges", () => {
  it("removes a busy interval from the middle", () => {
    expect(
      subtractRanges([[600, 1140]], [[660, 720]])
    ).toEqual([
      [600, 660],
      [720, 1140],
    ]);
  });

  it("handles a busy interval covering the whole window", () => {
    expect(subtractRanges([[600, 720]], [[0, 1440]])).toEqual([]);
  });

  it("handles overlapping busy intervals", () => {
    expect(
      subtractRanges([[600, 1140]], [
        [600, 660],
        [630, 700],
      ])
    ).toEqual([[700, 1140]]);
  });
});

describe("computeSlots", () => {
  const monday = day(2026, 9, 21); // a Monday
  expect(monday.getUTCDay()).toBe(1);

  it("generates 30-min slots inside working hours", () => {
    const slots = computeSlots({
      date: startOfUtcDay(monday),
      durationMin: 60,
      rules: businessRules,
      blockedDates: [],
      busy: [],
      now: day(2026, 9, 20), // Sunday — no lead-time clipping
    });
    expect(slots[0]).toBe("2026-09-21T10:00:00.000Z");
    const last = slots[slots.length - 1];
    expect(last).toBe("2026-09-21T18:00:00.000Z"); // must END by 19:00
    expect(slots).toHaveLength(17); // 10:00 → 18:00 inclusive, step 30
  });

  it("respects existing bookings", () => {
    const busy: BusyInterval[] = [
      { start: new Date("2026-09-21T11:00:00Z"), end: new Date("2026-09-21T12:30:00Z") },
    ];
    const slots = computeSlots({
      date: startOfUtcDay(monday),
      durationMin: 60,
      rules: businessRules,
      blockedDates: [],
      busy,
      now: day(2026, 9, 20),
    });
    expect(slots).not.toContain("2026-09-21T11:00:00.000Z");
    expect(slots).not.toContain("2026-09-21T11:30:00.000Z");
    expect(slots).not.toContain("2026-09-21T12:00:00.000Z");
    expect(slots).toContain("2026-09-21T10:00:00.000Z");
    expect(slots).toContain("2026-09-21T12:30:00.000Z");
  });

  it("returns nothing on blocked days", () => {
    const slots = computeSlots({
      date: startOfUtcDay(monday),
      durationMin: 60,
      rules: businessRules,
      blockedDates: [startOfUtcDay(monday)],
      busy: [],
      now: day(2026, 9, 20),
    });
    expect(slots).toEqual([]);
  });

  it("returns nothing on days without rules", () => {
    const sunday = day(2026, 9, 20);
    const slots = computeSlots({
      date: startOfUtcDay(sunday),
      durationMin: 60,
      rules: businessRules,
      blockedDates: [],
      busy: [],
    });
    expect(slots).toEqual([]);
  });

  it("drops slots that start too soon (lead time)", () => {
    const now = new Date("2026-09-21T12:10:00Z"); // during the day
    const slots = computeSlots({
      date: startOfUtcDay(monday),
      durationMin: 60,
      rules: businessRules,
      blockedDates: [],
      busy: [],
      now,
      minLeadMinutes: 60,
    });
    // earliest start = 13:10 → first 30-min-aligned slot at/after = 13:30
    expect(slots[0]).toBe("2026-09-21T13:30:00.000Z");
  });

  it("skips slots longer than the remaining window", () => {
    const slots = computeSlots({
      date: startOfUtcDay(monday),
      durationMin: 120,
      rules: businessRules,
      blockedDates: [],
      busy: [{ start: new Date("2026-09-21T17:00:00Z"), end: new Date("2026-09-21T19:00:00Z") }],
      now: day(2026, 9, 20),
    });
    const last = slots[slots.length - 1];
    expect(last).toBe("2026-09-21T15:00:00.000Z"); // 15:00 + 2h = 17:00
  });

  it("merges split working windows", () => {
    const slots = computeSlots({
      date: startOfUtcDay(monday),
      durationMin: 30,
      rules: [
        { weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60 },
        { weekday: 1, startMinute: 10 * 60, endMinute: 13 * 60 },
      ],
      blockedDates: [],
      busy: [],
      now: day(2026, 9, 20),
    });
    expect(slots[0]).toBe("2026-09-21T09:00:00.000Z");
    const last = slots[slots.length - 1];
    expect(last).toBe("2026-09-21T12:30:00.000Z");
  });
});
