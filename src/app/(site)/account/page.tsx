"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { CalendarDays, CalendarPlus, Heart, Star, UserRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BookingStatusBadge, EmptyState } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/client";
import { formatBookingTime, initials } from "@/lib/utils";

export default function AccountPage() {
  const { data: session } = useSession();

  const me = useQuery<{ user: { name: string; email: string; city: string | null; avatarUrl: string | null; createdAt: string } }>({
    queryKey: ["me"],
    queryFn: () => api("/api/me"),
  });

  const bookings = useQuery<{ bookings: Array<{ id: string; status: string; scheduledAt: string; services: Array<{ name: string }>; artist: { displayName: string } }> }>({
    queryKey: ["bookings", "recent"],
    queryFn: () => api("/api/bookings?status=ALL"),
  });

  const favorites = useQuery<{ favorites: unknown[] }>({
    queryKey: ["favorites"],
    queryFn: () => api("/api/favorites"),
  });

  const upcoming = (bookings.data?.bookings ?? [])
    .filter((b) => ["PENDING", "CONFIRMED", "RESCHEDULE_REQUESTED"].includes(b.status))
    .slice(0, 4);

  return (
    <div className="container max-w-4xl py-8">
      <PageHeader
        title="My account"
        actions={
          <Button asChild variant="outline"><Link href="/account/settings"><UserRound /> Edit profile</Link></Button>
        }
      />
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-5 p-6">
          <Avatar className="h-16 w-16 border">
            {me.data?.user.avatarUrl ? <AvatarImage src={me.data.user.avatarUrl} alt="" /> : null}
            <AvatarFallback className="text-xl">{initials(session?.user?.name ?? "S")}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">{session?.user?.name}</p>
            <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Sevika member{me.data?.user.createdAt ? ` since ${new Date(me.data.user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}` : ""}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <CalendarDays className="h-5 w-5 text-primary" />
            <div>
              <p className="text-lg font-bold">{bookings.data?.bookings.length ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Total bookings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Star className="h-5 w-5 text-primary" />
            <div>
              <p className="text-lg font-bold">
                {bookings.data?.bookings.filter((b) => b.status === "COMPLETED").length ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Heart className="h-5 w-5 text-primary" />
            <div>
              <p className="text-lg font-bold">{favorites.data?.favorites.length ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Favorite artists</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Upcoming & pending</h2>
        <Button asChild variant="ghost" size="sm"><Link href="/bookings">View all</Link></Button>
      </div>
      {bookings.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : upcoming.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus />}
          title="Nothing booked yet"
          description="Your next appointment is a few taps away."
          action={<Button asChild><Link href="/discover">Discover artists</Link></Button>}
        />
      ) : (
        <div className="space-y-3">
          {upcoming.map((b) => (
            <Link key={b.id} href={`/bookings/${b.id}`} className="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent">
              <div>
                <p className="text-sm font-semibold">{b.artist.displayName}</p>
                <p className="text-xs text-muted-foreground">{b.services.map((s) => s.name).join(" · ")}</p>
              </div>
              <div className="text-right">
                <BookingStatusBadge status={b.status} />
                <p className="mt-1 text-xs text-muted-foreground">{formatBookingTime(b.scheduledAt, { withDate: true })}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
