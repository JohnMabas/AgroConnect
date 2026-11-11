import {
  CooperativeAgentAssignment,
  AgentActivityLog,
} from "../../database/models/index.js";
import type { AgentAssignmentData } from "../cooperatives/cooperatives.types.js";
import { buildAgentAssignmentData } from "../cooperatives/cooperatives.service.js";

export interface AgentActivityData {
  id: string;
  agent_user_id: string | null;
  farmer_user_id: string | null;
  cooperative_id: string | null;
  action: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  resource_type: string | null;
  resource_id: string | null;
  approval_required: boolean;
  approval_id: string | null;
  approval_status: string | null;
  action_result: string | null;
  created_at: Date;
}

function buildActivityData(log: AgentActivityLog): AgentActivityData {
  return {
    id: log.id,
    agent_user_id: log.agent_user_id ?? null,
    farmer_user_id: log.farmer_user_id ?? null,
    cooperative_id: log.cooperative_id ?? null,
    action: log.action,
    description: log.description ?? null,
    metadata: log.metadata ?? null,
    resource_type: log.resource_type ?? null,
    resource_id: log.resource_id ?? null,
    approval_required: log.approval_required ?? false,
    approval_id: log.approval_id ?? null,
    approval_status: log.approval_status ?? null,
    action_result: log.action_result ?? null,
    created_at: log.created_at!,
  };
}

/**
 * Get all active cooperative assignments for an agent.
 */
export async function getMyAssignments(agentUserId: string): Promise<AgentAssignmentData[]> {
  const assignments = await CooperativeAgentAssignment.findAll({
    where: { agent_user_id: agentUserId, status: "active" },
    order: [["assigned_at", "DESC"]],
  });
  return assignments.map(buildAgentAssignmentData);
}

/**
 * Get paginated activity logs for an agent, newest first.
 */
export async function getMyActivities(
  agentUserId: string,
  page: number,
  limit: number,
): Promise<{ activities: AgentActivityData[]; total: number }> {
  const offset = (page - 1) * limit;
  const { count, rows } = await AgentActivityLog.findAndCountAll({
    where: { agent_user_id: agentUserId },
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });
  return {
    activities: rows.map(buildActivityData),
    total: count,
  };
}
