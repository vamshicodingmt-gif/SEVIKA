"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, ExternalLink, RotateCcw, Scissors, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState, RatingStars, VerifiedBadge } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/utils";

interface ArtistRow {
  id: string;
  displayName: string;
  city: string | null;
  verificationStatus: string;
  onlineStatus: string;
  ratingAvg: number;
  ratingCount: number;
  completedJobs: number;
  createdAt: string;
  user: { id: string; name: string; email: string; suspended: boolean; createdAt: string };
  _count: { services: number; portfolio: number; reviews: number; bookingsAsArtist: number };
}

export default function AdminArtistsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [verification, setVerification] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ artists: ArtistRow[]; total: number; page: number; pageSize: number }>({
    queryKey: ["admin", "artists", q, verification, page],
    queryFn: () => api(`/api/admin/artists?q=${encodeURIComponent(q)}&verification=${verification}&page=${page}`),
  });

  const patchUser = useMutation({
    mutationFn: ({ id, ...body }: { id: string; suspended?: boolean; suspensionReason?: string }) =>
      api(`/api/admin/users/${id}`, { method: "PATCH", json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "artists"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPages = data ? Math.max(Math.ceil(data.total / data.pageSize), 1) : 1;
  const artists = data?.artists ?? [];

  return (
    <div>
      <PageHeader title="Artist management" description="Directory, standing and account actions" />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search artist name or email…" className="pl-9" />
        </div>
        <Select value={verification} onValueChange={(v) => { setVerification(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All verification states</SelectItem>
            <SelectItem value="VERIFIED">Verified</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="UNVERIFIED">Unverified</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : artists.length === 0 ? (
        <EmptyState icon={<Scissors />} title="No artists found" />
      ) : (
        <div className="space-y-2">
          {artists.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/artists/${a.id}`} className="font-semibold hover:text-primary">
                      {a.displayName} <ExternalLink className="inline h-3 w-3" />
                    </Link>
                    <VerifiedBadge status={a.verificationStatus} />
                    {a.user.suspended && (
                      <Badge variant="outline" className="border-transparent bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">Suspended</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.user.email} · {a.city ?? "no city"} · {a._count.services} services · {a._count.portfolio} portfolio ·{" "}
                    {a._count.bookingsAsArtist} bookings · joined {timeAgo(a.user.createdAt)}
                  </p>
                </div>
                <RatingStars rating={a.ratingAvg} count={a.ratingCount} />
                {a.user.suspended ? (
                  <Button variant="outline" size="sm" disabled={patchUser.isPending} onClick={() => patchUser.mutate({ id: a.user.id, suspended: false })}>
                    <RotateCcw /> Restore
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={patchUser.isPending}
                    onClick={() => {
                      const reason = prompt(`Reason for suspending ${a.displayName}?`);
                      if (reason === null) return;
                      patchUser.mutate({ id: a.user.id, suspended: true, suspensionReason: reason });
                    }}
                  >
                    <Ban className="text-destructive" /> Suspend
                  </Button>
                )}
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
