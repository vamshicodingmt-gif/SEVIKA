"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, FolderOpen, MessageSquare, Star, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/utils";

interface PortfolioRow {
  id: string;
  type: string;
  url: string;
  title: string | null;
  moderationStatus: string;
  createdAt: string;
  artist: { displayName: string };
}
interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  hidden: boolean;
  createdAt: string;
  customer: { name: string; email: string };
  artist: { displayName: string };
}

export default function AdminModerationPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"portfolio" | "reviews">("portfolio");

  const portfolio = useQuery<{ items: PortfolioRow[] }>({
    queryKey: ["admin", "moderation", "portfolio"],
    queryFn: () => api("/api/admin/moderation/portfolio"),
    enabled: tab === "portfolio",
  });

  const reviews = useQuery<{ reviews: ReviewRow[]; total: number }>({
    queryKey: ["admin", "moderation", "reviews"],
    queryFn: () => api("/api/admin/reviews?filter=all"),
    enabled: tab === "reviews",
  });

  const moderatePortfolio = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/admin/portfolio/${id}`, { method: "PATCH", json: { moderationStatus: status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "moderation"] });
      toast.success("Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moderateReview = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) =>
      api(`/api/admin/reviews/${id}`, { method: "PATCH", json: { hidden } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "moderation"] });
      toast.success("Review updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteReview = useMutation({
    mutationFn: (id: string) => api(`/api/admin/reviews/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "moderation"] });
      toast.success("Review deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = (portfolio.data?.items ?? []).filter((i) => i.moderationStatus === "PENDING");

  return (
    <div>
      <PageHeader title="Content moderation" description="Portfolio uploads and customer reviews" />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "portfolio" | "reviews")} className="mb-5">
        <TabsList>
          <TabsTrigger value="portfolio">Portfolio {pending.length > 0 && <Badge className="ml-1.5">{pending.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "portfolio" && (
        portfolio.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}</div>
        ) : (portfolio.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={<FolderOpen />} title="No portfolio items yet" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {portfolio.data!.items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="relative aspect-square bg-secondary">
                  {item.type === "VIDEO" ? (
                    <video src={item.url} className="h-full w-full object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt={item.title ?? ""} className="h-full w-full object-cover" loading="lazy" />
                  )}
                  <Badge
                    variant="outline"
                    className={`absolute left-2 top-2 border-transparent ${
                      item.moderationStatus === "APPROVED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                      : item.moderationStatus === "PENDING" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                    }`}
                  >
                    {item.moderationStatus}
                  </Badge>
                </div>
                <CardContent className="p-3">
                  <p className="truncate text-xs font-medium">{item.title || "Untitled"}</p>
                  <p className="truncate text-[11px] text-muted-foreground">by {item.artist.displayName}</p>
                  <div className="mt-2 flex gap-1.5">
                    <Button size="sm" variant="secondary" className="h-7 flex-1 text-[11px]" disabled={moderatePortfolio.isPending} onClick={() => moderatePortfolio.mutate({ id: item.id, status: "APPROVED" })}>
                      <Check /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 flex-1 text-[11px]" disabled={moderatePortfolio.isPending} onClick={() => moderatePortfolio.mutate({ id: item.id, status: "REJECTED" })}>
                      <X /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === "reviews" && (
        reviews.isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : (reviews.data?.reviews.length ?? 0) === 0 ? (
          <EmptyState icon={<MessageSquare />} title="No reviews yet" />
        ) : (
          <div className="space-y-3">
            {reviews.data!.reviews.map((r) => (
              <Card key={r.id} className={r.hidden ? "opacity-60" : ""}>
                <CardContent className="flex flex-wrap items-start gap-3 p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 text-sm font-semibold">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {r.rating}.0
                      </span>
                      <p className="text-sm font-medium">{r.customer.name}</p>
                      <span className="text-xs text-muted-foreground">on {r.artist.displayName} · {timeAgo(r.createdAt)}</span>
                      {r.hidden && <Badge variant="outline" className="border-transparent bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">Hidden</Badge>}
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={moderateReview.isPending} onClick={() => moderateReview.mutate({ id: r.id, hidden: !r.hidden })}>
                      {r.hidden ? "Unhide" : "Hide"}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={deleteReview.isPending} onClick={() => confirm("Permanently delete this review?") && deleteReview.mutate(r.id)}>
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
