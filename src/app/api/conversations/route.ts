import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { conversationCreateSchema } from "@/lib/validators";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();

  const where =
    user.role === "ARTIST"
      ? { artistId: user.artistProfileId! }
      : { customerId: user.id };

  const conversations = await db.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, avatarUrl: true } },
      artist: {
        select: { id: true, displayName: true, user: { select: { avatarUrl: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    take: 50,
  });

  const enriched = await Promise.all(
    conversations.map(async (c) => {
      const unread = await db.message.count({
        where: {
          conversationId: c.id,
          readAt: null,
          NOT: { senderId: user.id },
        },
      });
      return {
        id: c.id,
        lastMessageAt: c.lastMessageAt,
        counterpart:
          user.role === "ARTIST"
            ? { id: c.customer.id, name: c.customer.name, avatarUrl: c.customer.avatarUrl }
            : { id: c.artist.id, name: c.artist.displayName, avatarUrl: c.artist.user.avatarUrl },
        lastMessage: c.messages[0]
          ? {
              body: c.messages[0].body,
              attachmentUrl: c.messages[0].attachmentUrl,
              senderId: c.messages[0].senderId,
              createdAt: c.messages[0].createdAt,
            }
          : null,
        unread,
      };
    })
  );

  return jsonOk({ conversations: enriched });
});

/** POST: open (or reuse) a conversation with an artist. */
export const POST = route(async (req) => {
  const user = await requireUser();
  if (user.role !== "CUSTOMER") throw new ApiError(403, "Only customers can start chats here");
  const { artistId } = await parseBody(req, conversationCreateSchema);

  const artist = await db.artistProfile.findUnique({
    where: { id: artistId },
    include: { user: { select: { suspended: true } } },
  });
  if (!artist || artist.user.suspended) throw new ApiError(404, "Artist not found");

  const conversation = await db.conversation.upsert({
    where: { customerId_artistId: { customerId: user.id, artistId } },
    create: { customerId: user.id, artistId },
    update: {},
  });

  // Nudge the artist that a conversation opened (only first time).
  const messageCount = await db.message.count({ where: { conversationId: conversation.id } });
  if (messageCount === 0) {
    await notify({
      userId: artist.userId,
      type: "MESSAGE",
      title: `${user.name} wants to chat`,
      body: "Say hello and share your portfolio.",
      link: `/messages?c=${conversation.id}`,
    });
  }

  return jsonOk({ conversation }, 201);
});
