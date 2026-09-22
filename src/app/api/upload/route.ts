import { jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { z } from "zod";
import { createUploadTarget } from "@/lib/upload";

export const dynamic = "force-dynamic";

const uploadIntentSchema = z.object({
  filename: z.string().trim().min(1).max(200),
  contentType: z.string().trim().min(3).max(100),
});

/** POST: get a short-lived upload target (S3 presign / Cloudinary / dev local). */
export const POST = route(async (req) => {
  await requireUser();
  const { filename, contentType } = await parseBody(req, uploadIntentSchema);
  const target = await createUploadTarget(filename, contentType);
  return jsonOk(target, 201);
});
