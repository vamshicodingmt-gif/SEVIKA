import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const roleEnum = z.enum(["CUSTOMER", "ARTIST"]);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
  role: roleEnum.default("CUSTOMER"),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Password is required"),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Artist profile & catalogue
// ---------------------------------------------------------------------------

export const artistProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(160).optional().or(z.literal("")),
  bio: z.string().trim().max(4000).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  serviceArea: z.string().trim().max(300).optional().or(z.literal("")),
  addressLine: z.string().trim().max(300).optional().or(z.literal("")),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  yearsExperience: z.number().int().min(0).max(60).default(0),
  categories: z.array(z.string().trim().max(40)).max(8).default([]),
  specialties: z.array(z.string().trim().max(60)).max(12).default([]),
  languages: z.array(z.string().trim().max(30)).max(10).default([]),
  coverUrl: z.string().url().nullable().optional(),
  onlineStatus: z.enum(["ONLINE", "BUSY", "OFFLINE"]).optional(),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Service name is required").max(120),
  category: z.string().trim().min(1, "Pick a category").max(40),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  priceFrom: z.number().int().min(1, "Price must be at least ₹1").max(10_000_000),
  durationMin: z.number().int().min(15, "Minimum 15 minutes").max(600, "Maximum 10 hours"),
  isActive: z.boolean().default(true),
});

export const servicePatchSchema = serviceSchema.partial();

export const availabilityRulesSchema = z.object({
  rules: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        startMinute: z.number().int().min(0).max(1440),
        endMinute: z.number().int().min(0).max(1440),
      })
    )
    .max(30)
    .refine(
      (rules) => rules.every((r) => r.startMinute < r.endMinute),
      "Start time must be before end time"
    ),
});

export const blockedDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

export const portfolioSchema = z.object({
  type: z.enum(["IMAGE", "VIDEO"]).default("IMAGE"),
  url: z.string().url("Provide the uploaded file URL"),
  thumbUrl: z.string().url().nullable().optional(),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  category: z.string().trim().max(40).optional().or(z.literal("")),
});

export const certificateSchema = z.object({
  title: z.string().trim().min(2, "Certificate title is required").max(160),
  issuer: z.string().trim().max(160).optional().or(z.literal("")),
  fileUrl: z.string().url("Upload the certificate file first"),
});

export const verificationRequestSchema = z.object({
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const onlineStatusSchema = z.object({
  onlineStatus: z.enum(["ONLINE", "BUSY", "OFFLINE"]),
});

// ---------------------------------------------------------------------------
// Bookings — free to create. No payment data by design.
// ---------------------------------------------------------------------------

export const bookingCreateSchema = z
  .object({
    artistId: z.string().cuid(),
    serviceIds: z.array(z.string()).min(1, "Select at least one service"),
    scheduledAt: z.string().datetime({ offset: true }),
    type: z.enum(["INDIVIDUAL", "GROUP_EVENT"]).default("INDIVIDUAL"),
    locationType: z.enum(["HOME", "STUDIO", "VENUE"]).default("HOME"),
    addressLine: z.string().trim().max(300).optional().or(z.literal("")),
    city: z.string().trim().max(120).optional().or(z.literal("")),
    pincode: z.string().trim().max(20).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    groupName: z.string().trim().max(160).optional().or(z.literal("")),
    headcount: z.number().int().min(2).max(500).optional(),
    contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.type === "GROUP_EVENT") {
      if (!data.groupName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["groupName"], message: "Event name is required" });
      }
      if (!data.headcount) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["headcount"], message: "Headcount is required" });
      }
    }
    if (data.locationType !== "STUDIO") {
      if (!data.addressLine) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["addressLine"], message: "Service address is required" });
      }
      if (!data.city) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["city"], message: "City is required" });
      }
    }
  });

export const rescheduleSchema = z.object({
  proposedAt: z.string().datetime({ offset: true }),
});

export const bookingActionSchema = z.object({
  action: z.enum([
    "CONFIRM",
    "DECLINE",
    "START",
    "COMPLETE",
    "CANCEL",
    "PROPOSE_RESCHEDULE",
    "ACCEPT_RESCHEDULE",
    "DECLINE_RESCHEDULE",
  ]),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
  proposedAt: z.string().datetime({ offset: true }).optional(),
});

// ---------------------------------------------------------------------------
// Social / trust
// ---------------------------------------------------------------------------

export const reviewSchema = z.object({
  bookingId: z.string(),
  rating: z.number().int().min(1, "Pick a rating").max(5),
  comment: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const reviewReplySchema = z.object({
  reply: z.string().trim().min(1).max(2000),
});

export const reviewModerateSchema = z.object({
  hidden: z.boolean(),
});

export const favoriteSchema = z.object({
  artistId: z.string(),
});

export const reportSchema = z.object({
  targetType: z.enum(["USER", "ARTIST_PROFILE", "REVIEW", "PORTFOLIO"]),
  targetId: z.string().min(1),
  reason: z.string().trim().min(3).max(160),
  details: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const reportResolveSchema = z.object({
  status: z.enum(["REVIEWING", "RESOLVED", "DISMISSED"]),
  resolution: z.string().trim().max(1000).optional().or(z.literal("")),
});

// ---------------------------------------------------------------------------
// Messaging & notifications
// ---------------------------------------------------------------------------

export const conversationCreateSchema = z.object({
  artistId: z.string(),
});

export const messageSchema = z
  .object({
    body: z.string().trim().max(4000).optional().or(z.literal("")),
    attachmentUrl: z.string().url().nullable().optional(),
  })
  .refine((d) => (d.body && d.body.length > 0) || d.attachmentUrl, {
    message: "Message cannot be empty",
    path: ["body"],
  });

export const notificationReadSchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Support
// ---------------------------------------------------------------------------

export const ticketSchema = z.object({
  subject: z.string().trim().min(4, "Subject is required").max(200),
  message: z.string().trim().min(10, "Tell us a bit more").max(4000),
});

export const ticketReplySchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const ticketStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const adminUserPatchSchema = z.object({
  suspended: z.boolean().optional(),
  suspensionReason: z.string().trim().max(500).optional().or(z.literal("")),
  role: z.enum(["CUSTOMER", "ARTIST", "ADMIN"]).optional(),
});

export const certificateModerateSchema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "REJECTED"]),
});

export const portfolioModerateSchema = z.object({
  moderationStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

export const verificationReviewSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  reviewNote: z.string().trim().max(1000).optional().or(z.literal("")),
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export const artistSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  category: z.string().trim().max(40).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(200).optional(),
  sort: z.enum(["rating", "price", "distance", "newest"]).default("rating"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
