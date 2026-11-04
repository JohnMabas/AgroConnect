import {
  CooperativeAgentAssignment,
  AgentActivityLog,
} from "../../database/models/index.js";
import type { AgentAssignmentData } from "../cooperatives/cooperatives.types.js";
import { buildAgentAssignmentData } from "../cooperatives/cooperatives.service.js";

export interface AgentActivityData {
  id: string;
  agent_user_id: string;
  farmer_user_id: string;
  cooperative_id: string | null;
  action: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

function buildActivityData(log: AgentActivityLog): AgentActivityData {
  return {
    id: log.id,
    agent_user_id: log.agent_user_id,
    farmer_user_id: log.farmer_user_id,
    cooperative_id: log.cooperative_id ?? null,
    action: log.action,
    description: log.description ?? null,
    metadata: log.metadata ?? null,
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
