"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { LifeBuoy, MessageSquare, Plus, Send } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/client";
import { BRAND } from "@/lib/constants";
import { cn, timeAgo } from "@/lib/utils";

interface TicketMessageRow {
  id: string;
  body: string;
  isStaff: boolean;
  createdAt: string;
}
interface TicketRow {
  id: string;
  code: string;
  subject: string;
  status: string;
  updatedAt: string;
  messages: TicketMessageRow[];
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  RESOLVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  CLOSED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400",
};

export default function SupportPage() {
  const { status: sessionStatus } = useSession();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [activeTicket, setActiveTicket] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const tickets = useQuery<{ tickets: TicketRow[] }>({
    queryKey: ["tickets"],
    queryFn: () => api("/api/tickets"),
    enabled: sessionStatus === "authenticated",
  });

  const create = useMutation({
    mutationFn: () => api("/api/tickets", { method: "POST", json: { subject, message } }),
    onSuccess: () => {
      toast.success("Ticket created — we'll get back to you soon");
      setOpen(false);
      setSubject("");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendReply = useMutation({
    mutationFn: () => api(`/api/tickets/${activeTicket}`, { method: "POST", json: { body: reply } }),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ticket = tickets.data?.tickets.find((t) => t.id === activeTicket) ?? null;

  return (
    <div className="container max-w-2xl py-8">
      <PageHeader
        title="Support"
        description={`${BRAND.name} is free — so is asking us anything`}
        actions={
          sessionStatus === "authenticated" ? (
            <Button onClick={() => setOpen(true)}><Plus /> New ticket</Button>
          ) : undefined
        }
      />

      {sessionStatus !== "authenticated" ? (
        <EmptyState
          icon={<LifeBuoy />}
          title="Sign in to contact support"
          description={`Or email us at ${BRAND.supportEmail}`}
        />
      ) : tickets.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (tickets.data?.tickets.length ?? 0) === 0 ? (
        <EmptyState
          icon={<MessageSquare />}
          title="No tickets yet"
          description="Questions, feedback or issues — create a ticket and our team will help."
          action={<Button onClick={() => setOpen(true)}>Contact support</Button>}
        />
      ) : (
        <div className="space-y-3">
          {tickets!.data!.tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTicket(t.id)}
              className={cn(
                "block w-full rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent",
                activeTicket === t.id && "border-primary/40 ring-1 ring-primary/20"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{t.subject}</p>
                <Badge variant="outline" className={cn("border-transparent", STATUS_COLORS[t.status])}>
                  {t.status.replaceAll("_", " ").toLowerCase()}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{t.messages[0]?.body}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">#{t.code.slice(-6).toUpperCase()} · updated {timeAgo(t.updatedAt)}</p>
            </button>
          ))}
        </div>
      )}

      {/* Ticket thread */}
      <Dialog open={ticket !== null} onOpenChange={(v) => !v && setActiveTicket(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{ticket?.subject}</DialogTitle>
          </DialogHeader>
          <div className="max-h-72 space-y-3 overflow-y-auto scrollbar-thin">
            {ticket?.messages.map((m) => (
              <div key={m.id} className={cn("rounded-xl p-3 text-sm", m.isStaff ? "bg-secondary" : "brand-gradient text-white")}>
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-75">
                  {m.isStaff ? "Sevika team" : "You"} · {timeAgo(m.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-line">{m.body}</p>
              </div>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (reply.trim()) sendReply.mutate();
            }}
          >
            <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" />
            <Button type="submit" size="icon" disabled={sendReply.isPending || !reply.trim()} aria-label="Send reply"><Send /></Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* New ticket */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Sevika support</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What's this about?" maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what happened…" maxLength={4000} className="min-h-28" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={create.isPending || subject.trim().length < 4 || message.trim().length < 10} onClick={() => create.mutate()}>
              Create ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
