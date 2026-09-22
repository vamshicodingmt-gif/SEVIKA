"use client";

/** Tiny typed fetch wrapper for client components. */
export async function api<T = unknown>(
  path: string,
  options?: RequestInit & { json?: unknown }
): Promise<T> {
  const { json, ...rest } = options ?? {};
  const res = await fetch(path, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(rest.headers ?? {}),
    },
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function uploadFile(file: File): Promise<string> {
  const target = await api<{ storage: string; uploadUrl: string; fileUrl: string; fields?: Record<string, string> }>(
    "/api/upload",
    { method: "POST", json: { filename: file.name, contentType: file.type } }
  );

  if (target.storage === "s3") {
    const res = await fetch(target.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) throw new Error("Upload to storage failed");
    return target.fileUrl;
  }

  if (target.storage === "cloudinary") {
    const form = new FormData();
    form.append("file", file);
    for (const [k, v] of Object.entries(target.fields ?? {})) form.append(k, v);
    const res = await fetch(target.uploadUrl, { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? "Upload to Cloudinary failed");
    return data.secure_url as string;
  }

  // local dev fallback
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(target.uploadUrl, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Local upload failed");
  return data.fileUrl as string;
}
