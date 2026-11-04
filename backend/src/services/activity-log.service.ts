import { AgentActivityLog } from "../database/models/index.js";

export interface LogAgentActivityParams {
  agentUserId: string;
  farmerUserId: string;
  cooperativeId?: string;
  action: string;
  description?: string;
  /**
   * Optional structured metadata. Never include passwords, tokens, or OTPs.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Record an agent activity in the audit log.
 *
 * This is a fire-and-log function — it does not throw on failure so that
 * activity logging never interrupts the primary business flow. Errors are
 * logged to stderr only.
 *
 * Callers must ensure no secrets (passwords, tokens, OTPs) are passed in
 * metadata or description.
 */
export async function logAgentActivity(params: LogAgentActivityParams): Promise<void> {
  try {
    await AgentActivityLog.create({
      agent_user_id: params.agentUserId,
      farmer_user_id: params.farmerUserId,
      cooperative_id: params.cooperativeId ?? null,
      action: params.action,
      description: params.description ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    // Activity logging must never crash the caller's request.
    console.error("[activity-log] Failed to write activity log:", err);
  }
}
