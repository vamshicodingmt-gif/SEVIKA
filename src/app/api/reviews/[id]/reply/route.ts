import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { reviewReplySchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export const POST = route(async (req, ctx: { params: { id: string } }) => {
  const user = await requireUser(["ARTIST"]);
  const { reply } = await parseBody(req, reviewReplySchema);

  const review = await db.review.findUnique({ where: { id: ctx.params.id } });
  if (!review) throw new ApiError(404, "Review not found");
  if (review.artistId !== user.artistProfileId) throw new ApiError(403, "This review isn't for your profile");

  const updated = await db.review.update({
    where: { id: review.id },
    data: { artistReply: reply },
  });
  return jsonOk({ review: updated });
});
