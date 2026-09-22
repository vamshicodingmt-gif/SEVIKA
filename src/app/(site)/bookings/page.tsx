"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CalendarPlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BookingStatusBadge, EmptyState } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/client";
import { cn, formatBookingTime } from "@/lib/utils";

interface BookingRow {
  id: string;
  code: string;
  status: string;
  type: string;
  scheduledAt: string;
  durationMin: number;
  groupName: string | null;
  services: Array<{ id: string; name: string }>;
  customer: { id: string; name: string; avatarUrl: string | null };
  artist: { id: string; displayName: string; user: { avatarUrl: string | null } };
  review: { id: string } | null;
}

const TABS = ["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

export default function BookingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");
  const { data, isLoading } = useQuery<{ bookings: BookingRow[]; role: string }>({
    queryKey: ["bookings", tab],
    queryFn: () => api(`/api/bookings?status=${tab}`),
    refetchInterval: 15_000,
  });

  const bookings = data?.bookings ?? [];

  return (
    <div className="container py-8">
      <PageHeader
        title="My bookings"
        description="Requests, appointments and history — always free on Sevika"
        actions={
          <Button asChild>
            <Link href="/discover"><CalendarPlus /> New booking</Link>
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as (typeof TABS)[number])} className="mb-5">
        <TabsList className="flex-wrap h-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t}>{t === "ALL" ? "All" : t === "PENDING" ? "Pending" : t === "CONFIRMED" ? "Upcoming" : t === "COMPLETED" ? "Completed" : "Cancelled"}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title="No bookings here yet"
          description="Discover professionals and request your first appointment — it's completely free."
          action={
            <Button asChild>
              <Link href="/discover">Discover artists</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const isCustomer = data?.role === "customer";
            const counterpart = isCustomer
              ? { name: b.artist.displayName, avatar: b.artist.user.avatarUrl }
              : { name: b.customer.name, avatar: b.customer.avatarUrl };
            return (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="block rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar className="h-11 w-11 border">
                    {counterpart.avatar ? <AvatarImage src={counterpart.avatar} alt="" /> : null}
                    <AvatarFallback>{counterpart.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{counterpart.name}</p>
                      {b.type === "GROUP_EVENT" && (
                        <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[11px] font-semibold text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400">
                          {b.groupName || "Group event"}
                        </span>
                      )}
                      <BookingStatusBadge status={b.status} />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {b.services.map((s) => s.name).join(" · ")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatBookingTime(b.scheduledAt, { withDate: true })} · {b.code.slice(-6).toUpperCase()}
                    </p>
                  </div>
                  <div className={cn("flex items-center gap-2")}>
                    {b.status === "COMPLETED" && !b.review && isCustomer && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                        Review pending
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
