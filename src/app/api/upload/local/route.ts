import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { ApiError, jsonOk, requireUser, route } from "@/lib/api-helpers";
import { extensionOf, MAX_UPLOAD_BYTES } from "@/lib/upload";

export const dynamic = "force-dynamic";

/**
 * DEV-ONLY local storage fallback (no S3/Cloudinary configured).
 * Enabled outside production; Vercel deployments must configure S3/Cloudinary.
 */
export const POST = route(async (req) => {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(404, "Not found");
  }
  await requireUser();

  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? `file-${Date.now()}`;
  const safeName = `${Date.now()}-${name.replace(/[^\w.-]/g, "_").slice(0, 120)}`;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "file field is required");
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, "File is too large");

  const ext = extensionOf(file.name || safeName);
  const finalName = `${safeName.replace(/\.\w+$/, "")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, finalName), Buffer.from(await file.arrayBuffer()));

  return jsonOk({ fileUrl: `/uploads/${finalName}` }, 201);
});
