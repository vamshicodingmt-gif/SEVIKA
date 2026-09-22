"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/utils";

interface AuditRow {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  actor: { name: string; email: string; role: string } | null;
  actorEmail: string | null;
}

const ACTION_TONE = (action: string) =>
  action.includes("suspend") || action.includes("delete") || action.includes("reject") || action.includes("hide")
    ? "text-rose-600 dark:text-rose-400"
    : action.includes("verif") || action.includes("restore") || action.includes("approved")
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-muted-foreground";

export default function AdminAuditPage() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ logs: AuditRow[]; total: number; page: number; pageSize: number }>({
    queryKey: ["admin", "audit", action, page],
    queryFn: () => api(`/api/admin/audit?action=${encodeURIComponent(action)}&page=${page}`),
  });

  const totalPages = data ? Math.max(Math.ceil(data.total / data.pageSize), 1) : 1;

  return (
    <div>
      <PageHeader title="Audit log" description="Every admin action and sensitive event, on the record" />

      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} placeholder="Filter by action — e.g. user.suspend" className="pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (data?.logs.length ?? 0) === 0 ? (
        <EmptyState icon={<ScrollText />} title="No audit entries" description="Actions will appear here as they happen." />
      ) : (
        <>
          <div className="space-y-2">
            {data!.logs.map((log) => (
              <Card key={log.id}>
                <CardContent className="flex flex-wrap items-center gap-3 p-3.5 text-sm">
                  <span className={`font-mono text-xs font-semibold ${ACTION_TONE(log.action)}`}>{log.action}</span>
                  <span className="text-xs text-muted-foreground">
                    by {log.actor?.name ?? log.actorEmail ?? "system"}
                    {log.targetType && log.targetId ? ` → ${log.targetType} ${log.targetId.slice(-6)}` : ""}
                  </span>
                  {log.meta && Object.keys(log.meta).length > 0 && (
                    <span className="truncate font-mono text-[11px] text-muted-foreground">{JSON.stringify(log.meta).slice(0, 90)}</span>
                  )}
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{timeAgo(log.createdAt)}</span>
                </CardContent>
              </Card>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
