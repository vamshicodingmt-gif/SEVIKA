"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ArrowLeft, ImageIcon, MessagesSquare, Paperclip, Send, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { api, uploadFile } from "@/lib/client";
import { cn, initials, timeAgo } from "@/lib/utils";

interface ConversationRow {
  id: string;
  lastMessageAt: string;
  counterpart: { id: string; name: string; avatarUrl: string | null };
  lastMessage: { body: string | null; attachmentUrl: string | null; senderId: string; createdAt: string } | null;
  unread: number;
}
interface MessageRow {
  id: string;
  senderId: string;
  body: string | null;
  attachmentUrl: string | null;
  createdAt: string;
  sender: { id: string; name: string; avatarUrl: string | null };
}

function MessagesInner() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();

  const activeId = params.get("c");
  const artistTarget = params.get("to"); // artistId → open/create conversation

  const { data: conversations, isLoading } = useQuery<{ conversations: ConversationRow[] }>({
    queryKey: ["conversations"],
    queryFn: () => api("/api/conversations"),
    refetchInterval: 8_000,
  });

  // Open a conversation by artist id (from "Chat" buttons).
  const ensureConversation = useMutation({
    mutationFn: (artistId: string) => api<{ conversation: { id: string } }>("/api/conversations", { method: "POST", json: { artistId } }),
    onSuccess: ({ conversation }) => {
      router.replace(`/messages?c=${conversation.id}`);
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (artistTarget) ensureConversation.mutate(artistTarget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistTarget]);

  const active = conversations?.conversations.find((c) => c.id === activeId) ?? null;

  return (
    <div className="container py-8">
      <PageHeader title="Messages" description="Chat directly with customers and artists — free, always" />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Conversation list ------------------------------------------------ */}
        <div className={cn("rounded-2xl border bg-card shadow-sm", activeId && "hidden lg:block")}>
          <div className="max-h-[70vh] overflow-y-auto scrollbar-thin">
            {isLoading ? (
              <div className="space-y-2 p-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : (conversations?.conversations.length ?? 0) === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No conversations yet.<br />Start one from any artist profile.
              </div>
            ) : (
              conversations!.conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.replace(`/messages?c=${c.id}`)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors last:border-0 hover:bg-accent",
                    c.id === activeId && "bg-accent"
                  )}
                >
                  <Avatar className="h-10 w-10 border">
                    {c.counterpart.avatarUrl ? <AvatarImage src={c.counterpart.avatarUrl} alt="" /> : null}
                    <AvatarFallback>{initials(c.counterpart.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{c.counterpart.name}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(c.lastMessageAt)}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.lastMessage?.body ?? (c.lastMessage?.attachmentUrl ? "📎 Attachment" : "Say hello 👋")}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full brand-gradient px-1.5 text-[10px] font-bold text-white">
                      {c.unread}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread ------------------------------------------------------------ */}
        <div className="rounded-2xl border bg-card shadow-sm">
          {activeId && active ? (
            <Thread
              key={active.id}
              conversationId={active.id}
              counterpart={active.counterpart}
              meId={session?.user?.id ?? ""}
            />
          ) : (
            <div className="hidden h-full min-h-[420px] items-center justify-center lg:flex">
              <EmptyState
                icon={<MessagesSquare />}
                title="Select a conversation"
                description="Your chats with artists and customers appear here."
                className="border-0"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Thread({
  conversationId,
  counterpart,
  meId,
}: {
  conversationId: string;
  counterpart: { id: string; name: string; avatarUrl: string | null };
  meId: string;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery<{ messages: MessageRow[] }>({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const res = await api<{ messages: MessageRow[] }>(`/api/conversations/${conversationId}/messages`);
      return res;
    },
    refetchInterval: 4_000, // near-realtime chat
  });

  const messages = useMemo(() => data?.messages ?? [], [data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (messages.length > 0) qc.invalidateQueries({ queryKey: ["conversations"] });
  }, [messages.length, qc]);

  const send = useCallback(
    async (body: string | null, attachmentUrl: string | null) => {
      if (!body && !attachmentUrl) return;
      setSending(true);
      try {
        await api(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          json: { body: body ?? undefined, attachmentUrl },
        });
        await qc.invalidateQueries({ queryKey: ["messages", conversationId] });
        setText("");
        setAttachment(null);
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setSending(false);
      }
    },
    [conversationId, qc]
  );

  async function pickAttachment(file: File) {
    try {
      const url = await uploadFile(file);
      setAttachment(url);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => router.replace("/messages")} aria-label="Back">
          <ArrowLeft />
        </Button>
        <Avatar className="h-9 w-9 border">
          {counterpart.avatarUrl ? <AvatarImage src={counterpart.avatarUrl} alt="" /> : null}
          <AvatarFallback>{initials(counterpart.name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold">{counterpart.name}</p>
          <p className="text-[11px] text-muted-foreground">Sevika chat · typically replies within a day</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                  mine ? "brand-gradient text-white" : "bg-secondary"
                )}
              >
                {m.attachmentUrl && (
                  m.attachmentUrl.endsWith(".mp4") ? (
                    <video src={m.attachmentUrl} controls className="mb-1 max-h-56 rounded-lg" />
                  ) : m.attachmentUrl.endsWith(".pdf") ? (
                    <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="mb-1 flex items-center gap-2 rounded-lg bg-black/10 px-3 py-2 font-medium">
                      <Paperclip className="h-4 w-4" /> Open attachment
                    </a>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.attachmentUrl} alt="attachment" className="mb-1 max-h-56 rounded-lg object-cover" />
                  )
                )}
                {m.body && <p className="whitespace-pre-line break-words">{m.body}</p>}
                <p className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-muted-foreground")}>
                  {timeAgo(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {attachment && (
        <div className="mx-4 mb-2 flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-sm">
          <span className="flex items-center gap-2 truncate"><ImageIcon className="h-4 w-4" /> Attachment ready</span>
          <button onClick={() => setAttachment(null)} aria-label="Remove attachment"><X className="h-4 w-4" /></button>
        </div>
      )}

      <form
        className="flex items-center gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(text.trim(), attachment);
        }}
      >
        <label className="cursor-pointer rounded-full p-2 hover:bg-accent" aria-label="Attach a file">
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4"
            onChange={(e) => e.target.files?.[0] && pickAttachment(e.target.files[0])}
          />
          <Paperclip className="h-4 w-4 text-muted-foreground" />
        </label>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message…"
          maxLength={4000}
        />
        <Button type="submit" size="icon" disabled={sending || (!text.trim() && !attachment)} aria-label="Send">
          <Send />
        </Button>
      </form>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesInner />
    </Suspense>
  );
}
