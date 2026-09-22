import type { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";

interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/** Create an in-app notification. Never throws into the caller's flow. */
export async function notify(input: NotifyInput) {
  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body?.slice(0, 600),
        link: input.link,
      },
    });
  } catch (err) {
    console.error("[notify] failed", err);
  }
}
