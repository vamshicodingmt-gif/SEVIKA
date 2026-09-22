"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays, CalendarPlus, CheckCircle2, Eye, GraduationCap, Star, TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { BookingStatusBadge, VerifiedBadge } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { OnlineToggle } from "./online-toggle";
import { api } from "@/lib/client";
import { durationLabel, formatBookingTime } from "@/lib/utils";

interface StudioStats {
  profile: {
    displayName: string;
    completedJobs: number;
    ratingAvg: number;
    ratingCount: number;
    profileViews: number;
    verificationStatus: string;
    onlineStatus: string;
    city: string | null;
  };
  counts: { services: number; portfolio: number; certificates: number; pendingCertificates: number };
  upcoming: Array<{
    id: string;
    code: string;
    status: string;
    scheduledAt: string;
    durationMin: number;
    customer: { name: string };
    services: Array<{ name: string }>;
  }>;
  weekly: Array<{ day: string; count: number }>;
}

export default function ArtistDashboardPage() {
  const { data, isLoading } = useQuery<StudioStats>({
    queryKey: ["artist", "dashboard"],
    queryFn: () => api("/api/artist/dashboard"),
    refetchInterval: 30_000,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const { profile, counts, upcoming, weekly } = data;

  return (
    <div>
      <PageHeader
        title={`Namaste, ${profile.displayName.split(" ")[0]} 🌸`}
        description="Your studio at a glance — 100% of earnings are yours, always"
        actions={<OnlineToggle current={profile.onlineStatus} />}
      />

      {/* Stats ----------------------------------------------------------- */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Completed jobs</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-1 text-2xl font-bold">{profile.completedJobs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Rating</p>
              <Star className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-1 text-2xl font-bold">
              {profile.ratingAvg > 0 ? profile.ratingAvg.toFixed(1) : "New"}
              <span className="ml-1 text-xs font-normal text-muted-foreground">({profile.ratingCount})</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Profile views</p>
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-1 text-2xl font-bold">{profile.profileViews}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Verification</p>
              <GraduationCap className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2">
              <VerifiedBadge status={profile.verificationStatus} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Setup checklist --------------------------------------------------- */}
      {(counts.services === 0 || counts.portfolio === 0 || counts.certificates === 0 || !profile.city) && (
        <Card className="mb-6 border-dashed">
          <CardContent className="p-5">
            <p className="mb-3 text-sm font-semibold">Complete your studio setup to attract more bookings</p>
            <div className="flex flex-wrap gap-2">
              {counts.services === 0 && (
                <Button asChild size="sm" variant="secondary"><Link href="/artist/services">+ Add your first service</Link></Button>
              )}
              {counts.portfolio === 0 && (
                <Button asChild size="sm" variant="secondary"><Link href="/artist/portfolio">+ Upload portfolio work</Link></Button>
              )}
              {counts.certificates === 0 && (
                <Button asChild size="sm" variant="secondary"><Link href="/artist/certificates">+ Upload certificates</Link></Button>
              )}
              {!profile.city && (
                <Button asChild size="sm" variant="secondary"><Link href="/artist/profile">+ Set your city & area</Link></Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Bookings trend ----------------------------------------------------- */}
        <Card>
          <CardContent className="p-6">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" /> Bookings — last 8 weeks
            </p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekly} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="sevika-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e11d48" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#8882" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" name="Bookings" stroke="#e11d48" fill="url(#sevika-area)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming ------------------------------------------------------------- */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4 text-primary" /> Upcoming & pending
              </p>
              <Button asChild size="sm" variant="ghost">
                <Link href="/bookings">All bookings</Link>
              </Button>
            </div>
            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link href="/discover"><CalendarPlus /> Preview discovery</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcoming.map((b) => (
                  <Link
                    key={b.id}
                    href={`/bookings/${b.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{b.customer.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{b.services.map((s) => s.name).join(" · ")}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <BookingStatusBadge status={b.status} />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatBookingTime(b.scheduledAt)} · {durationLabel(b.durationMin)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
