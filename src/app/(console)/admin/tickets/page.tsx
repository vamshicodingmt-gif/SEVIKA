"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LifeBuoy, Send } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/client";
import { cn, timeAgo } from "@/lib/utils";

interface TicketRow {
  id: string;
  code: string;
  subject: string;
  status: string;
  updatedAt: string;
  user: { id: string; name: string; email: string; role: string };
  messages: Array<{ id: string; body: string; isStaff: boolean; createdAt: string }>;
}

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  RESOLVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  CLOSED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
};

export default function AdminTicketsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("ALL");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const { data, isLoading } = useQuery<{ tickets: TicketRow[] }>({
    queryKey: ["admin", "tickets", status],
    queryFn: () => api(`/api/admin/tickets?status=${status}`),
    refetchInterval: 20_000,
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      api(`/api/admin/tickets/${id}`, { method: "PATCH", json: { status: newStatus } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
      toast.success("Ticket updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendReply = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      api(`/api/tickets/${id}`, { method: "POST", json: { body } }),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tickets = data?.tickets ?? [];
  const active = tickets.find((t) => t.id === activeId) ?? null;

  return (
    <div>
      <PageHeader title="Support tickets" description="Help customers and artists directly" />

      <div className="mb-5">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => (
              <SelectItem key={s} value={s}>{s === "ALL" ? "All statuses" : s.replaceAll("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : tickets.length === 0 ? (
        <EmptyState icon={<LifeBuoy />} title="No tickets" description="Inbox zero! 🎉" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <div className="space-y-2">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={cn(
                  "block w-full rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent",
                  activeId === t.id && "border-primary/40 ring-1 ring-primary/20"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{t.subject}</p>
                  <Badge variant="outline" className={`shrink-0 border-transparent ${STATUS_STYLE[t.status]}`}>{t.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {t.user.name} ({t.user.role.toLowerCase()}) · {timeAgo(t.updatedAt)}
                </p>
              </button>
            ))}
          </div>

          {active && (
            <Card>
              <CardContent className="flex h-[65vh] flex-col p-0">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
                  <div>
                    <p className="font-semibold">{active.subject}</p>
                    <p className="text-xs text-muted-foreground">#{active.code.slice(-6).toUpperCase()} · {active.user.email}</p>
                  </div>
                  <Select value={active.status} onValueChange={(v) => changeStatus.mutate({ id: active.id, newStatus: v })}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => (
                        <SelectItem key={s} value={s}>{s.replaceAll("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
                  {active.messages.map((m) => (
                    <div key={m.id} className={cn("max-w-[80%] rounded-xl p-3 text-sm", m.isStaff ? "ml-auto bg-secondary" : "brand-gradient text-white")}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-75">
                        {m.isStaff ? "Sevika team" : active.user.name} · {timeAgo(m.createdAt)}
                      </p>
                      <p className="mt-1 whitespace-pre-line">{m.body}</p>
                    </div>
                  ))}
                </div>
                <form
                  className="flex gap-2 border-t p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (reply.trim()) sendReply.mutate({ id: active.id, body: reply.trim() });
                  }}
                >
                  <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply as Sevika support…" maxLength={4000} />
                  <Button type="submit" size="icon" disabled={sendReply.isPending || !reply.trim()} aria-label="Send"><Send /></Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
