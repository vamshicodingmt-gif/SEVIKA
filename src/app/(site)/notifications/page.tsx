"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/client";
import { cn, timeAgo } from "@/lib/utils";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ notifications: NotificationRow[]; unread: number }>({
    queryKey: ["notifications", "page"],
    queryFn: () => api("/api/notifications?take=50"),
    refetchInterval: 15_000,
  });

  const markAll = useMutation({
    mutationFn: () => api("/api/notifications/read", { method: "POST", json: { all: true } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOne = useMutation({
    mutationFn: (id: string) => api("/api/notifications/read", { method: "POST", json: { ids: [id] } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="container max-w-2xl py-8">
      <PageHeader
        title="Notifications"
        description="Bookings, messages and account updates"
        actions={
          (data?.unread ?? 0) > 0 ? (
            <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
              <CheckCheck /> Mark all read
            </Button>
          ) : undefined
        }
      />
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (data?.notifications.length ?? 0) === 0 ? (
        <EmptyState icon={<Bell />} title="Nothing yet" description="Notifications about your bookings and messages will appear here." />
      ) : (
        <div className="space-y-2">
          {data!.notifications.map((n) => (
            <Link
              key={n.id}
              href={n.link ?? "#"}
              onClick={() => !n.readAt && markOne.mutate(n.id)}
              className={cn(
                "block rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent",
                !n.readAt && "border-primary/30 bg-secondary/50"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
