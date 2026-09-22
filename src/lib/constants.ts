export const BRAND = {
  name: "Sevika",
  tagline: "Book trusted beauty & grooming professionals",
  supportEmail: "support@sevika.app",
  /** Shown wherever money could be misunderstood. Sevika is 0% commission. */
  paymentNote:
    "Payment arrangements are made directly between the customer and professional.",
};

export interface Category {
  slug: string;
  label: string;
  emoji: string;
  blurb: string;
}

export const CATEGORIES: Category[] = [
  { slug: "hair", label: "Hair", emoji: "💇", blurb: "Cuts, colour, styling & treatments" },
  { slug: "makeup", label: "Makeup", emoji: "💄", blurb: "Party, HD & airbrush makeup" },
  { slug: "skin-facial", label: "Skin & Facial", emoji: "✨", blurb: "Facials, cleanups & glow care" },
  { slug: "nails", label: "Nails", emoji: "💅", blurb: "Manicure, pedicure & extensions" },
  { slug: "bridal", label: "Bridal & Occasion", emoji: "👰", blurb: "Bridal packages & event looks" },
  { slug: "spa-massage", label: "Spa & Massage", emoji: "🌿", blurb: "Relaxation & wellness therapy" },
  { slug: "mens-grooming", label: "Men's Grooming", emoji: "✂️", blurb: "Beard, haircuts & grooming" },
  { slug: "waxing-threading", label: "Waxing & Threading", emoji: "🪶", blurb: "Hair removal & brow shaping" },
];

export function categoryLabel(slug: string | null | undefined) {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function categoryEmoji(slug: string | null | undefined) {
  return CATEGORIES.find((c) => c.slug === slug)?.emoji ?? "💎";
}

export const CITIES = [
  "Mumbai",
  "Delhi NCR",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Jaipur",
  "Ahmedabad",
  "Lucknow",
];

export const WEEKDAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

export const BOOKING_STATUS_META: Record<
  string,
  { label: string; className: string; dot: string }
> = {
  PENDING: {
    label: "Pending approval",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  IN_PROGRESS: {
    label: "In progress",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-400",
    dot: "bg-zinc-500",
  },
  DECLINED: {
    label: "Declined",
    className: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  RESCHEDULE_REQUESTED: {
    label: "Reschedule requested",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-400",
    dot: "bg-sky-500",
  },
};

export const ONLINE_STATUS_META: Record<string, { label: string; className: string; dot: string }> = {
  ONLINE: {
    label: "Online",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  BUSY: {
    label: "Busy",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  OFFLINE: {
    label: "Offline",
    className: "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
    dot: "bg-zinc-400",
  },
};

export const VERIFICATION_BADGE: Record<string, { label: string; className: string }> = {
  VERIFIED: {
    label: "Verified by Sevika",
    className: "bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white",
  },
  PENDING: { label: "Verification pending", className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400" },
  REJECTED: { label: "Not verified", className: "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400" },
  UNVERIFIED: { label: "Unverified", className: "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400" },
};

export const MAX_UPLOAD_MB = 50;
export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "video/mp4",
];
