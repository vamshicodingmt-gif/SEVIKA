"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, ExternalLink, FileText, GraduationCap, Inbox } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/utils";

interface CertRow {
  id: string;
  title: string;
  issuer: string | null;
  fileUrl: string;
  status: string;
  createdAt: string;
}
interface VerificationRow {
  id: string;
  status: string;
  note: string | null;
  reviewNote: string | null;
  createdAt: string;
  artist: {
    id: string;
    displayName: string;
    city: string | null;
    ratingAvg: number;
    completedJobs: number;
    user: { name: string; email: string; city: string | null };
    certificates: CertRow[];
  };
}

export default function AdminVerificationsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("PENDING");

  const { data, isLoading } = useQuery<{ requests: VerificationRow[] }>({
    queryKey: ["admin", "verifications", status],
    queryFn: () => api(`/api/admin/verifications?status=${status}`),
  });

  const review = useMutation({
    mutationFn: ({ id, verdict, reviewNote }: { id: string; verdict: "VERIFIED" | "REJECTED"; reviewNote?: string }) =>
      api(`/api/admin/verifications/${id}`, { method: "PATCH", json: { status: verdict, reviewNote } }),
    onSuccess: (_d, vars) => {
      toast.success(vars.verdict === "VERIFIED" ? "Artist verified 🎉" : "Verification rejected");
      qc.invalidateQueries({ queryKey: ["admin", "verifications"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moderateCert = useMutation({
    mutationFn: ({ id, certStatus }: { id: string; certStatus: string }) =>
      api(`/api/admin/certificates/${id}`, { method: "PATCH", json: { status: certStatus } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "verifications"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const requests = data?.requests ?? [];

  return (
    <div>
      <PageHeader title="Verification queue" description="Review certificates and grant the Verified badge" />

      <Tabs value={status} onValueChange={setStatus} className="mb-5">
        <TabsList>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="VERIFIED">Verified</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
      ) : requests.length === 0 ? (
        <EmptyState icon={<Inbox />} title="Queue is clear 🎉" description="No verification requests with this status." />
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 font-semibold">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      {r.artist.displayName}
                      <Badge variant="outline" className="border-transparent bg-secondary text-[10px]">{r.artist.city ?? "No city"}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.artist.user.email} · {r.artist.completedJobs} jobs · requested {timeAgo(r.createdAt)}
                    </p>
                    {r.note && <p className="mt-2 rounded-lg bg-secondary/60 p-3 text-sm">“{r.note}”</p>}
                  </div>
                  {r.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={review.isPending}
                        onClick={() => review.mutate({ id: r.id, verdict: "VERIFIED" })}
                      >
                        <BadgeCheck /> Approve verification
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={review.isPending}
                        onClick={() => {
                          const note = prompt("Reason for rejection (shared with the artist):") ?? undefined;
                          if (note !== null) review.mutate({ id: r.id, verdict: "REJECTED", reviewNote: note });
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {r.artist.certificates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No certificates uploaded.</p>
                  ) : (
                    r.artist.certificates.map((c) => (
                      <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <a href={c.fileUrl} target="_blank" rel="noreferrer" className="truncate text-sm font-medium hover:text-primary">
                            {c.title} <ExternalLink className="inline h-3 w-3" />
                          </a>
                          <p className="text-xs text-muted-foreground">
                            {c.issuer ? `${c.issuer} · ` : ""}uploaded {timeAgo(c.createdAt)}
                          </p>
                        </div>
                        <Badge variant="outline" className={`border-transparent ${
                          c.status === "VERIFIED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                          : c.status === "REJECTED" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                        }`}>
                          {c.status}
                        </Badge>
                        {c.status === "PENDING" && (
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="secondary" disabled={moderateCert.isPending} onClick={() => moderateCert.mutate({ id: c.id, certStatus: "VERIFIED" })}>
                              Verify
                            </Button>
                            <Button size="sm" variant="ghost" disabled={moderateCert.isPending} onClick={() => moderateCert.mutate({ id: c.id, certStatus: "REJECTED" })}>
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
