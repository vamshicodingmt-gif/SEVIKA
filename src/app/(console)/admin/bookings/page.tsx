"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ExternalLink, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BookingStatusBadge, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/client";
import { formatBookingTime, timeAgo } from "@/lib/utils";

interface AdminBookingRow {
  id: string;
  code: string;
  status: string;
  type: string;
  scheduledAt: string;
  createdAt: string;
  customer: { name: string; email: string };
  artist: { displayName: string };
  services: Array<{ name: string }>;
}

export default function AdminBookingsPage() {
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ bookings: AdminBookingRow[]; total: number; page: number; pageSize: number }>({
    queryKey: ["admin", "bookings", status, q, page],
    queryFn: () => api(`/api/admin/bookings?status=${status}&q=${encodeURIComponent(q)}&page=${page}`),
  });

  const totalPages = data ? Math.max(Math.ceil(data.total / data.pageSize), 1) : 1;

  return (
    <div>
      <PageHeader title="Booking management" description="All marketplace bookings — free of any fees" />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search ref, customer or artist…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["ALL", "PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DECLINED", "RESCHEDULE_REQUESTED"].map((s) => (
              <SelectItem key={s} value={s}>{s === "ALL" ? "All statuses" : s.replaceAll("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (data?.bookings.length ?? 0) === 0 ? (
        <EmptyState icon={<CalendarDays />} title="No bookings found" />
      ) : (
        <div className="space-y-2">
          {data!.bookings.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/bookings/${b.id}`} className="font-semibold hover:text-primary">
                      #{b.code.slice(-6).toUpperCase()} <ExternalLink className="inline h-3 w-3" />
                    </Link>
                    <BookingStatusBadge status={b.status} />
                    {b.type === "GROUP_EVENT" && (
                      <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-400">GROUP</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {b.customer.name} → {b.artist.displayName} · {b.services.map((s) => s.name).join(", ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">{formatBookingTime(b.scheduledAt)}</p>
                  <p className="text-[11px] text-muted-foreground">created {timeAgo(b.createdAt)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
