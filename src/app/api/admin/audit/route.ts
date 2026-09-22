import { db } from "@/lib/db";
import { jsonOk, requireUser, route } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireUser(["ADMIN"]);
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
  const pageSize = 30;

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where: action ? { action: { contains: action } } : {} }),
    db.auditLog.findMany({
      where: action ? { action: { contains: action } } : {},
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { name: true, email: true, role: true } } },
    }),
  ]);

  return jsonOk({ logs, total, page, pageSize });
});
