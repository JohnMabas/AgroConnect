import { AdminAuditLog } from "../../database/models/index.js";

export interface AdminAuditInput {
  admin_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason?: string | null;
  result?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Append an administrative action to the audit trail.
 *
 * Auditing must never mask the underlying operation result, so a write failure
 * is logged and swallowed. The admin action itself has already been authorised
 * by the route middleware and performed by the service layer.
 */
export async function recordAdminAudit(input: AdminAuditInput): Promise<void> {
  try {
    await AdminAuditLog.create({
      admin_user_id: input.admin_user_id,
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      reason: input.reason ?? null,
      result: input.result ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (error) {
    console.error(
      "[ADMIN AUDIT] Failed to record administrative action:",
      error instanceof Error ? error.message : error,
    );
  }
}
