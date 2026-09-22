import { db } from "@/lib/db";
import { jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { notificationReadSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  const user = await requireUser();
  const { ids, all } = await parseBody(req, notificationReadSchema);

  await db.notification.updateMany({
    where: {
      userId: user.id,
      readAt: null,
      ...(all ? {} : { id: { in: ids ?? [] } }),
    },
    data: { readAt: new Date() },
  });

  return jsonOk({ ok: true });
});
