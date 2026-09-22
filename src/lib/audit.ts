import { db } from "@/lib/db";

interface AuditInput {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}

/** Persist an audit trail entry. Admin actions and sensitive events only. */
export async function audit(input: AuditInput) {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        meta: (input.meta ?? undefined) as never,
      },
    });
  } catch (err) {
    console.error("[audit] failed", err);
  }
}
