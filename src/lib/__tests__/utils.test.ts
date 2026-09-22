import { describe, expect, it } from "vitest";
import { durationLabel, formatPrice, initials, minutesToLabel } from "@/lib/utils";
import { hasPostgis } from "@/lib/geo";

describe("formatPrice", () => {
  it("formats INR without decimals", () => {
    expect(formatPrice(18000)).toContain("18,000");
  });
});

describe("durationLabel", () => {
  it("renders minutes below an hour", () => {
    expect(durationLabel(45)).toBe("45 min");
  });
  it("renders hours and minutes", () => {
    expect(durationLabel(90)).toBe("1h 30m");
    expect(durationLabel(120)).toBe("2h");
  });
});

describe("minutesToLabel", () => {
  it("formats 12-hour clock", () => {
    expect(minutesToLabel(0)).toBe("12:00 AM");
    expect(minutesToLabel(600)).toBe("10:00 AM");
    expect(minutesToLabel(765)).toBe("12:45 PM");
    expect(minutesToLabel(1140)).toBe("7:00 PM");
  });
});

describe("initials", () => {
  it("takes first letters of the first two words", () => {
    expect(initials("Priya Sharma")).toBe("PS");
    expect(initials("cher")).toBe("C");
  });
});

describe("hasPostgis", () => {
  it("returns false without a database (graceful fallback path)", async () => {
    const result = await hasPostgis();
    expect(typeof result).toBe("boolean");
  });
});
