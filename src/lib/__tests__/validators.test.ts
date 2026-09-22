import { describe, expect, it } from "vitest";
import {
  artistSearchSchema,
  bookingCreateSchema,
  loginSchema,
  registerSchema,
  reviewSchema,
  serviceSchema,
} from "@/lib/validators";

describe("registerSchema", () => {
  it("accepts a valid customer registration", () => {
    const parsed = registerSchema.parse({
      name: "Priya Sharma",
      email: "PRIYA@Example.com ",
      password: "supersecret1",
      role: "CUSTOMER",
    });
    expect(parsed.email).toBe("priya@example.com");
  });

  it("rejects short passwords", () => {
    expect(
      registerSchema.safeParse({ name: "A B", email: "a@b.com", password: "short" }).success
    ).toBe(false);
  });

  it("defaults role to CUSTOMER", () => {
    const parsed = registerSchema.parse({ name: "A B", email: "a@b.com", password: "longenough" });
    expect(parsed.role).toBe("CUSTOMER");
  });
});

describe("loginSchema", () => {
  it("normalises the email", () => {
    const parsed = loginSchema.parse({ email: " USER@site.COM ", password: "x" });
    expect(parsed.email).toBe("user@site.com");
  });
});

describe("serviceSchema", () => {
  it("requires duration ≥ 15 and price ≥ 1", () => {
    expect(
      serviceSchema.safeParse({ name: "Cut", category: "hair", priceFrom: 0, durationMin: 30 }).success
    ).toBe(false);
    expect(
      serviceSchema.safeParse({ name: "Cut", category: "hair", priceFrom: 100, durationMin: 10 }).success
    ).toBe(false);
    expect(
      serviceSchema.safeParse({ name: "Cut", category: "hair", priceFrom: 100, durationMin: 45 }).success
    ).toBe(true);
  });
});

describe("bookingCreateSchema", () => {
  const base = {
    artistId: "ckynthhxz0000abcd1234efgh",
    serviceIds: ["svc1"],
    scheduledAt: "2026-10-01T10:00:00.000Z",
  };

  it("accepts a valid home booking with address", () => {
    const parsed = bookingCreateSchema.parse({ ...base, locationType: "HOME", addressLine: "A-1", city: "Mumbai" });
    expect(parsed.type).toBe("INDIVIDUAL");
  });

  it("requires an address for HOME visits", () => {
    const res = bookingCreateSchema.safeParse({ ...base, locationType: "HOME", city: "Mumbai" });
    expect(res.success).toBe(false);
  });

  it("doesn't require an address for STUDIO bookings", () => {
    const res = bookingCreateSchema.safeParse({ ...base, locationType: "STUDIO" });
    expect(res.success).toBe(true);
  });

  it("requires group name and headcount for GROUP_EVENT", () => {
    const res = bookingCreateSchema.safeParse({
      ...base,
      type: "GROUP_EVENT",
      locationType: "HOME",
      addressLine: "A-1",
      city: "Mumbai",
    });
    expect(res.success).toBe(false);

    const ok = bookingCreateSchema.safeParse({
      ...base,
      type: "GROUP_EVENT",
      locationType: "HOME",
      addressLine: "A-1",
      city: "Mumbai",
      groupName: "Bridal party",
      headcount: 6,
    });
    expect(ok.success).toBe(true);
  });

  it("requires at least one service", () => {
    const res = bookingCreateSchema.safeParse({ ...base, serviceIds: [] });
    expect(res.success).toBe(false);
  });
});

describe("reviewSchema", () => {
  it("clamps rating to 1–5", () => {
    expect(reviewSchema.safeParse({ bookingId: "b1", rating: 6 }).success).toBe(false);
    expect(reviewSchema.safeParse({ bookingId: "b1", rating: 0 }).success).toBe(false);
    expect(reviewSchema.safeParse({ bookingId: "b1", rating: 5, comment: "Great" }).success).toBe(true);
  });
});

describe("artistSearchSchema", () => {
  it("coerces query strings and booleans", () => {
    const parsed = artistSearchSchema.parse({
      minRating: "4",
      verifiedOnly: "true",
      lat: "19.07",
      lng: "72.87",
      radiusKm: "10",
      page: "2",
    });
    expect(parsed.minRating).toBe(4);
    expect(parsed.verifiedOnly).toBe(true);
    expect(parsed.lat).toBeCloseTo(19.07);
    expect(parsed.sort).toBe("rating");
    expect(parsed.page).toBe(2);
  });
});
