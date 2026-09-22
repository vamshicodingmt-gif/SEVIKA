"use client";

import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BOOKING_STATUS_META, ONLINE_STATUS_META, VERIFICATION_BADGE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function RatingStars({
  rating,
  count,
  size = 14,
  className,
}: {
  rating: number;
  count?: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={
              i <= Math.round(rating)
                ? "fill-amber-400 text-amber-400"
                : "fill-zinc-200 text-zinc-200 dark:fill-zinc-700 dark:text-zinc-700"
            }
          />
        ))}
      </span>
      <span className="text-xs font-medium text-muted-foreground">
        {rating > 0 ? rating.toFixed(1) : "New"}
        {typeof count === "number" && count > 0 ? ` (${count})` : ""}
      </span>
    </span>
  );
}

export function BookingStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = BOOKING_STATUS_META[status] ?? BOOKING_STATUS_META.PENDING;
  return (
    <Badge variant="outline" className={cn(meta.className, "border-transparent", className)}>
      <span className={cn("mr-1 h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </Badge>
  );
}

export function OnlineStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = ONLINE_STATUS_META[status] ?? ONLINE_STATUS_META.OFFLINE;
  return (
    <Badge variant="outline" className={cn(meta.className, "border-transparent", className)}>
      <span className={cn("mr-1 h-1.5 w-1.5 rounded-full animate-pulse", meta.dot)} />
      {meta.label}
    </Badge>
  );
}

export function VerifiedBadge({ status, className }: { status: string; className?: string }) {
  const meta = VERIFICATION_BADGE[status] ?? VERIFICATION_BADGE.UNVERIFIED;
  return (
    <Badge variant="outline" className={cn(meta.className, "border-transparent", className)}>
      {meta.label}
    </Badge>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-14 text-center", className)}>
      {icon && <div className="mb-3 text-muted-foreground [&_svg]:h-10 [&_svg]:w-10">{icon}</div>}
      <p className="text-base font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
