import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { messageSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/ratelimit";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

async function loadConversation(id: string, userId: string, role: string) {
  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true } },
      artist: { include: { user: { select: { id: true } } } },
    },
  });
  if (!conversation) throw new ApiError(404, "Conversation not found");
  const isCustomer = conversation.customerId === userId;
  const isArtist = role === "ARTIST" && conversation.artistId === conversation.artist.id && conversation.artist.user.id === userId;
  if (!isCustomer && !isArtist) throw new ApiError(404, "Conversation not found");
  return { conversation, isCustomer };
}

/** GET: message history (polled by the client for near-realtime chat). */
export const GET = route(async (req, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { conversation } = await loadConversation(ctx.params.id, user.id, user.role);

  const url = new URL(req.url);
  const after = url.searchParams.get("after");

  const messages = await db.message.findMany({
    where: {
      conversationId: conversation.id,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  });

  // Mark incoming messages as read.
  await db.message.updateMany({
    where: { conversationId: conversation.id, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  return jsonOk({ messages });
});

export const POST = route(async (req, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { conversation, isCustomer } = await loadConversation(ctx.params.id, user.id, user.role);

  const limit = await rateLimit("message", user.id);
  if (!limit.success) throw new ApiError(429, "You're sending messages too fast");

  const data = await parseBody(req, messageSchema);

  const message = await db.message.create({
    data: {
      conversationId: conversation.id,
      senderId: user.id,
      body: data.body || null,
      attachmentUrl: data.attachmentUrl ?? null,
    },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  });

  await db.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  const recipientId = isCustomer ? conversation.artist.user.id : conversation.customerId;
  await notify({
    userId: recipientId,
    type: "MESSAGE",
    title: `New message from ${user.name}`,
    body: data.body?.slice(0, 140) ?? "Sent an attachment",
    link: `/messages?c=${conversation.id}`,
  });

  return jsonOk({ message }, 201);
});
