"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, Cell, PieChart, Pie, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  BadgeCheck, CalendarCheck, CalendarDays, Flag, LifeBuoy, Scissors, Star, Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/client";

interface Stats {
  totals: {
    users: number; artists: number; customers: number; bookings: number;
    completedBookings: number; pendingBookings: number; reviews: number;
    openReports: number; openTickets: number; pendingVerifications: number; suspended: number;
  };
  trend: Array<{ day: string; bookings: number; signups: number; completed: number }>;
  categories: Array<{ category: string; count: number }>;
  topArtists: Array<{ id: string; displayName: string; completedJobs: number; ratingAvg: number; ratingCount: number; city: string | null }>;
}

const PIE_COLORS = ["#e11d48", "#d946ef", "#f43f5e", "#fb7185", "#a855f7", "#ec4899", "#f97316", "#8b5cf6"];

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ["admin", "stats"],
    queryFn: () => api("/api/admin/stats"),
    refetchInterval: 60_000,
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

  const t = data.totals;

  const cards = [
    { label: "Total users", value: t.users, sub: `${t.customers} customers · ${t.artists} artists`, icon: Users, tone: "text-primary" },
    { label: "Bookings", value: t.bookings, sub: `${t.pendingBookings} pending · ${t.completedBookings} completed`, icon: CalendarDays, tone: "text-emerald-500" },
    { label: "Verification queue", value: t.pendingVerifications, sub: "certificates awaiting review", icon: BadgeCheck, tone: "text-amber-500" },
    { label: "Open reports", value: t.openReports, sub: `${t.openTickets} open tickets · ${t.suspended} suspended`, icon: Flag, tone: "text-rose-500" },
  ];

  return (
    <div>
      <PageHeader title="Platform analytics" description="Sevika's pulse — users, bookings and marketplace health" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <c.icon className={`h-4 w-4 ${c.tone}`} />
              </div>
              <p className="mt-1 text-2xl font-bold">{c.value.toLocaleString("en-IN")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <p className="mb-4 text-sm font-semibold">Bookings & signups — last 30 days</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="a-bookings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e11d48" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="a-signups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#8882" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="bookings" stroke="#e11d48" fill="url(#a-bookings)" strokeWidth={2} />
                  <Area type="monotone" dataKey="signups" stroke="#8b5cf6" fill="url(#a-signups)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="mb-4 text-sm font-semibold">Artist categories</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categories}
                    dataKey="count"
                    nameKey="category"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {data.categories.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <p className="mb-4 text-sm font-semibold">Top artists by completed jobs</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topArtists} layout="vertical" margin={{ left: 30, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#8882" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="displayName" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="completedJobs" name="Completed jobs" fill="#e11d48" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="mb-4 text-sm font-semibold">Marketplace leaderboard</p>
            <div className="space-y-2">
              {data.topArtists.map((a, i) => (
                <Link
                  key={a.id}
                  href={`/artists/${a.id}`}
                  className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-accent"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full brand-gradient text-xs font-bold text-white">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.displayName}</p>
                    <p className="text-xs text-muted-foreground">{a.city ?? "—"} · {a.completedJobs} jobs</p>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {a.ratingAvg > 0 ? a.ratingAvg.toFixed(1) : "New"}
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Reviews", value: t.reviews, icon: Star },
                { label: "Tickets open", value: t.openTickets, icon: LifeBuoy },
                { label: "Suspended", value: t.suspended, icon: CalendarCheck },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-secondary/60 p-3">
                  <s.icon className="mx-auto h-4 w-4 text-primary" />
                  <p className="mt-1 text-lg font-bold">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            <Link href="/admin/users" className="mt-4 block rounded-xl border border-dashed p-3 text-center text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
              <Scissors className="mr-1 inline h-4 w-4" /> Manage users & artists →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
