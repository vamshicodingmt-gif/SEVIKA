"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Flag, Search, XCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/utils";

interface ReportRow {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
  resolution: string | null;
  createdAt: string;
  reporter: { name: string; email: string };
  resolvedBy: { name: string } | null;
  context: {
    kind: string;
    review?: { rating: number; comment: string | null; artist?: { displayName: string } } | null;
    item?: { url: string; title: string | null; artist?: { displayName: string } } | null;
    artist?: { displayName: string; bio: string | null } | null;
    user?: { name: string; email: string; role: string } | null;
  };
}

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  REVIEWING: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  RESOLVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  DISMISSED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
};

export default function AdminReportsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("OPEN");

  const { data, isLoading } = useQuery<{ reports: ReportRow[] }>({
    queryKey: ["admin", "reports", status],
    queryFn: () => api(`/api/admin/reports?status=${status}`),
  });

  const resolve = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      api(`/api/admin/reports/${id}`, {
        method: "PATCH",
        json: { status: newStatus, resolution: newStatus !== "REVIEWING" ? `Marked ${newStatus.toLowerCase()} by admin` : undefined },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Report updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reports = data?.reports ?? [];

  return (
    <div>
      <PageHeader title="Reports" description="Community reports — review and act" />

      <Tabs value={status} onValueChange={setStatus} className="mb-5">
        <TabsList>
          <TabsTrigger value="OPEN">Open</TabsTrigger>
          <TabsTrigger value="REVIEWING">Reviewing</TabsTrigger>
          <TabsTrigger value="RESOLVED">Resolved</TabsTrigger>
          <TabsTrigger value="DISMISSED">Dismissed</TabsTrigger>
          <TabsTrigger value="ALL">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : reports.length === 0 ? (
        <EmptyState icon={<Flag />} title="No reports" description="The marketplace is calm. 🌸" />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`border-transparent ${STATUS_STYLE[r.status]}`}>{r.status}</Badge>
                      <p className="text-sm font-semibold">{r.reason}</p>
                      <Badge variant="outline" className="text-[10px]">{r.targetType.replaceAll("_", " ")}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Reported by {r.reporter.name} · {timeAgo(r.createdAt)}
                      {r.resolvedBy ? ` · handled by ${r.resolvedBy.name}` : ""}
                    </p>
                    {r.details && <p className="mt-2 text-sm">“{r.details}”</p>}
                    {r.context.kind === "review" && r.context.review && (
                      <p className="mt-2 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
                        Review: {r.context.review.rating}★ on {r.context.review.artist?.displayName} — “{r.context.review.comment ?? "no text"}”
                      </p>
                    )}
                    {r.context.kind === "portfolio" && r.context.item?.url && (
                      <a href={r.context.item.url} target="_blank" rel="noreferrer" className="mt-2 inline-block rounded-lg bg-secondary/60 px-3 py-1.5 text-xs text-primary hover:underline">
                        View reported media ({r.context.item.artist?.displayName})
                      </a>
                    )}
                    {r.context.kind === "artist" && r.context.artist && (
                      <p className="mt-2 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
                        Artist: {r.context.artist.displayName}
                      </p>
                    )}
                    {r.context.kind === "user" && r.context.user && (
                      <p className="mt-2 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
                        User: {r.context.user.name} ({r.context.user.role})
                      </p>
                    )}
                  </div>
                  {r.status !== "RESOLVED" && r.status !== "DISMISSED" && (
                    <div className="flex gap-2">
                      {r.status === "OPEN" && (
                        <Button size="sm" variant="outline" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: r.id, newStatus: "REVIEWING" })}>
                          <Search /> Investigate
                        </Button>
                      )}
                      <Button size="sm" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: r.id, newStatus: "RESOLVED" })}>
                        <CheckCircle2 /> Resolve
                      </Button>
                      <Button size="sm" variant="ghost" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: r.id, newStatus: "DISMISSED" })}>
                        <XCircle /> Dismiss
                      </Button>
                    </div>
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
