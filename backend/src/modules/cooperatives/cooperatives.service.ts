import { Op } from "sequelize";
import {
  CooperativeProfile,
  CooperativeMembership,
  CooperativeAgentAssignment,
  UserRole,
  Role,
} from "../../database/models/index.js";
import type {
  CreateCooperativeInput,
  UpdateCooperativeInput,
  UpdateMembershipInput,
  AssignAgentInput,
} from "./cooperatives.validation.js";
import type {
  CooperativeData,
  MembershipData,
  AgentAssignmentData,
  CooperativeVerificationStatus,
  MembershipStatus,
  MembershipRole,
  AgentAssignmentStatus,
} from "./cooperatives.types.js";

// ─── Builders ─────────────────────────────────────────────────────────────────

export function buildCooperativeData(coop: CooperativeProfile): CooperativeData {
  return {
    id: coop.id,
    registered_by_user_id: coop.registered_by_user_id,
    cooperative_name: coop.cooperative_name,
    registration_number: coop.registration_number ?? null,
    description: coop.description ?? null,
    country: coop.country ?? null,
    state_or_region: coop.state_or_region ?? null,
    local_government_area: coop.local_government_area ?? null,
    community: coop.community ?? null,
    address: coop.address ?? null,
    contact_phone: coop.contact_phone ?? null,
    contact_email: coop.contact_email ?? null,
    logo_url: coop.logo_url ?? null,
    verification_status: (coop.verification_status ?? "pending") as CooperativeVerificationStatus,
    approval_notes: coop.approval_notes ?? null,
    approved_by_user_id: coop.approved_by_user_id ?? null,
    approved_at: coop.approved_at ?? null,
    created_at: coop.created_at!,
    updated_at: coop.updated_at!,
  };
}

export function buildMembershipData(m: CooperativeMembership): MembershipData {
  return {
    id: m.id,
    cooperative_id: m.cooperative_id,
    farmer_user_id: m.farmer_user_id,
    membership_number: m.membership_number ?? null,
    membership_role: (m.membership_role ?? "member") as MembershipRole,
    status: (m.status ?? "pending") as MembershipStatus,
    joined_at: m.joined_at ?? null,
    approved_by_user_id: m.approved_by_user_id ?? null,
    created_at: m.created_at!,
    updated_at: m.updated_at!,
  };
}

export function buildAgentAssignmentData(a: CooperativeAgentAssignment): AgentAssignmentData {
  return {
    id: a.id,
    cooperative_id: a.cooperative_id,
    agent_user_id: a.agent_user_id,
    assigned_by_user_id: a.assigned_by_user_id,
    status: (a.status ?? "active") as AgentAssignmentStatus,
    assigned_at: a.assigned_at!,
    created_at: a.created_at!,
    updated_at: a.updated_at!,
  };
}

// ─── Cooperative CRUD ─────────────────────────────────────────────────────────

export async function createCooperative(
  userId: string,
  data: CreateCooperativeInput,
): Promise<CooperativeData> {
  const coop = await CooperativeProfile.create({
    registered_by_user_id: userId,
    verification_status: "pending",
    ...data,
  });
  return buildCooperativeData(coop);
}

export async function getMyCooperative(userId: string): Promise<CooperativeData> {
  const coop = await CooperativeProfile.findOne({
    where: { registered_by_user_id: userId },
  });
  if (!coop) {
    throw Object.assign(new Error("Cooperative not found."), { code: "NOT_FOUND" });
  }
  return buildCooperativeData(coop);
}

export async function updateMyCooperative(
  userId: string,
  coopId: string,
  data: UpdateCooperativeInput,
): Promise<CooperativeData> {
  const coop = await CooperativeProfile.findOne({
    where: { id: coopId, registered_by_user_id: userId },
  });
  if (!coop) {
    throw Object.assign(new Error("Cooperative not found or you do not own it."), {
      code: "NOT_FOUND",
    });
  }
  await coop.update(data);
  return buildCooperativeData(coop);
}

export async function getCooperativeById(id: string): Promise<CooperativeData> {
  const coop = await CooperativeProfile.findByPk(id);
  if (!coop) {
    throw Object.assign(new Error("Cooperative not found."), { code: "NOT_FOUND" });
  }
  return buildCooperativeData(coop);
}

export async function listApprovedCooperatives(
  page: number,
  limit: number,
): Promise<{ cooperatives: CooperativeData[]; total: number }> {
  const offset = (page - 1) * limit;
  const { count, rows } = await CooperativeProfile.findAndCountAll({
    where: { verification_status: "approved" },
    limit,
    offset,
    order: [["cooperative_name", "ASC"]],
  });
  return {
    cooperatives: rows.map(buildCooperativeData),
    total: count,
  };
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function adminListCooperatives(
  status: string | undefined,
  page: number,
  limit: number,
): Promise<{ cooperatives: CooperativeData[]; total: number }> {
  const offset = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (status) {
    where["verification_status"] = status;
  }
  const { count, rows } = await CooperativeProfile.findAndCountAll({
    where,
    limit,
    offset,
    order: [["created_at", "DESC"]],
  });
  return {
    cooperatives: rows.map(buildCooperativeData),
    total: count,
  };
}

export async function adminApproveCooperative(
  adminUserId: string,
  coopId: string,
  notes?: string,
): Promise<CooperativeData> {
  const coop = await CooperativeProfile.findByPk(coopId);
  if (!coop) {
    throw Object.assign(new Error("Cooperative not found."), { code: "NOT_FOUND" });
  }
  await coop.update({
    verification_status: "approved",
    approved_by_user_id: adminUserId,
    approved_at: new Date(),
    approval_notes: notes ?? null,
  });
  return buildCooperativeData(coop);
}

export async function adminRejectCooperative(
  adminUserId: string,
  coopId: string,
  notes: string,
): Promise<CooperativeData> {
  const coop = await CooperativeProfile.findByPk(coopId);
  if (!coop) {
    throw Object.assign(new Error("Cooperative not found."), { code: "NOT_FOUND" });
  }
  await coop.update({
    verification_status: "rejected",
    approved_by_user_id: adminUserId,
    approval_notes: notes,
  });
  return buildCooperativeData(coop);
}

export async function adminSuspendCooperative(
  adminUserId: string,
  coopId: string,
  notes: string,
): Promise<CooperativeData> {
  const coop = await CooperativeProfile.findByPk(coopId);
  if (!coop) {
    throw Object.assign(new Error("Cooperative not found."), { code: "NOT_FOUND" });
  }
  await coop.update({
    verification_status: "suspended",
    approved_by_user_id: adminUserId,
    approval_notes: notes,
  });
  return buildCooperativeData(coop);
}

// ─── Membership ───────────────────────────────────────────────────────────────

export async function requestMembership(
  farmerUserId: string,
  coopId: string,
): Promise<MembershipData> {
  const coop = await CooperativeProfile.findByPk(coopId);
  if (!coop) {
    throw Object.assign(new Error("Cooperative not found."), { code: "NOT_FOUND" });
  }
  if (coop.verification_status !== "approved") {
    throw Object.assign(
      new Error("Membership requests can only be made to approved cooperatives."),
      { code: "COOP_NOT_APPROVED" },
    );
  }

  const existing = await CooperativeMembership.findOne({
    where: {
      cooperative_id: coopId,
      farmer_user_id: farmerUserId,
      status: { [Op.in]: ["pending", "active"] },
    },
  });
  if (existing) {
    throw Object.assign(
      new Error("You already have an active or pending membership in this cooperative."),
      { code: "DUPLICATE_MEMBERSHIP" },
    );
  }

  const membership = await CooperativeMembership.create({
    cooperative_id: coopId,
    farmer_user_id: farmerUserId,
    status: "pending",
    membership_role: "member",
  });

  return buildMembershipData(membership);
}

export async function listMemberships(
  coopId: string,
  requesterId: string,
  requesterRoles: string[],
): Promise<MembershipData[]> {
  // Only cooperative rep (registered_by_user_id) or admin may list
  const isAdmin = requesterRoles.includes("admin");
  if (!isAdmin) {
    const coop = await CooperativeProfile.findByPk(coopId);
    if (!coop || coop.registered_by_user_id !== requesterId) {
      throw Object.assign(
        new Error("You do not have permission to view memberships for this cooperative."),
        { code: "FORBIDDEN" },
      );
    }
  }

  const memberships = await CooperativeMembership.findAll({
    where: { cooperative_id: coopId },
    order: [["created_at", "DESC"]],
  });

  return memberships.map(buildMembershipData);
}

export async function getMyMemberships(userId: string): Promise<MembershipData[]> {
  const memberships = await CooperativeMembership.findAll({
    where: { farmer_user_id: userId },
    order: [["created_at", "DESC"]],
  });
  return memberships.map(buildMembershipData);
}

export async function updateMembershipStatus(
  coopId: string,
  membershipId: string,
  requesterId: string,
  newStatus: string,
  requesterRoles: string[],
): Promise<MembershipData> {
  const membership = await CooperativeMembership.findOne({
    where: { id: membershipId, cooperative_id: coopId },
  });
  if (!membership) {
    throw Object.assign(new Error("Membership not found."), { code: "NOT_FOUND" });
  }

  const isAdmin = requesterRoles.includes("admin");
  const isFarmer = membership.farmer_user_id === requesterId;

  // Check if requester is the cooperative rep
  const coop = await CooperativeProfile.findByPk(coopId);
  const isCoopRep = coop?.registered_by_user_id === requesterId;

  if (isFarmer) {
    // Farmer can only leave
    if (newStatus !== "left") {
      throw Object.assign(new Error("Farmers can only set membership status to 'left'."), {
        code: "FORBIDDEN",
      });
    }
  } else if (isCoopRep || isAdmin) {
    // Coop rep / admin can approve, reject, or suspend
    if (!["active", "rejected", "suspended"].includes(newStatus)) {
      throw Object.assign(
        new Error("Cooperative representatives can set status to 'active', 'rejected', or 'suspended'."),
        { code: "FORBIDDEN" },
      );
    }
  } else {
    throw Object.assign(
      new Error("You do not have permission to update this membership."),
      { code: "FORBIDDEN" },
    );
  }

  const updateData: Partial<{ status: MembershipStatus; joined_at: Date; approved_by_user_id: string }> = {
    status: newStatus as MembershipStatus,
  };
  if (newStatus === "active" && !membership.joined_at) {
    updateData.joined_at = new Date();
    updateData.approved_by_user_id = requesterId;
  }

  await membership.update(updateData);
  return buildMembershipData(membership);
}

// ─── Agents ───────────────────────────────────────────────────────────────────

async function hasRole(userId: string, roleName: string): Promise<boolean> {
  const count = await UserRole.count({
    where: { user_id: userId },
    include: [
      {
        model: Role,
        as: "role",
        where: { name: roleName },
      },
    ],
  });
  return count > 0;
}

export async function assignAgent(
  coopId: string,
  data: AssignAgentInput,
  assignedByUserId: string,
): Promise<AgentAssignmentData> {
  const { agent_user_id: agentUserId } = data;

  if (agentUserId === assignedByUserId) {
    throw Object.assign(new Error("You cannot assign yourself as an agent."), {
      code: "INVALID_AGENT",
    });
  }

  const coop = await CooperativeProfile.findOne({
    where: { id: coopId, registered_by_user_id: assignedByUserId },
  });
  if (!coop) {
    throw Object.assign(
      new Error("Cooperative not found or you do not own it."),
      { code: "NOT_FOUND" },
    );
  }
  if (coop.verification_status !== "approved") {
    throw Object.assign(
      new Error("Agents can only be assigned to approved cooperatives."),
      { code: "COOP_NOT_APPROVED" },
    );
  }

  // Verify the agent has the 'cooperative_agent' role
  const agentHasRole = await hasRole(agentUserId, "cooperative_agent");
  if (!agentHasRole) {
    throw Object.assign(
      new Error("The specified user does not have the cooperative_agent role."),
      { code: "INVALID_AGENT" },
    );
  }

  // Check for existing active assignment
  const existing = await CooperativeAgentAssignment.findOne({
    where: { cooperative_id: coopId, agent_user_id: agentUserId, status: "active" },
  });
  if (existing) {
    throw Object.assign(
      new Error("This agent is already actively assigned to this cooperative."),
      { code: "DUPLICATE_ASSIGNMENT" },
    );
  }

  const assignment = await CooperativeAgentAssignment.create({
    cooperative_id: coopId,
    agent_user_id: agentUserId,
    assigned_by_user_id: assignedByUserId,
    status: "active",
    assigned_at: new Date(),
  });

  return buildAgentAssignmentData(assignment);
}

export async function listAgents(
  coopId: string,
  requesterId: string,
  requesterRoles: string[],
): Promise<AgentAssignmentData[]> {
  const isAdmin = requesterRoles.includes("admin");
  if (!isAdmin) {
    const coop = await CooperativeProfile.findByPk(coopId);
    if (!coop || coop.registered_by_user_id !== requesterId) {
      throw Object.assign(
        new Error("You do not have permission to view agents for this cooperative."),
        { code: "FORBIDDEN" },
      );
    }
  }

  const assignments = await CooperativeAgentAssignment.findAll({
    where: { cooperative_id: coopId },
    order: [["assigned_at", "DESC"]],
  });

  return assignments.map(buildAgentAssignmentData);
}

export async function deactivateAgent(
  coopId: string,
  agentId: string,
  requesterId: string,
): Promise<AgentAssignmentData> {
  const coop = await CooperativeProfile.findOne({
    where: { id: coopId, registered_by_user_id: requesterId },
  });
  if (!coop) {
    throw Object.assign(
      new Error("Cooperative not found or you do not own it."),
      { code: "NOT_FOUND" },
    );
  }

  const assignment = await CooperativeAgentAssignment.findOne({
    where: { id: agentId, cooperative_id: coopId },
  });
  if (!assignment) {
    throw Object.assign(new Error("Agent assignment not found."), { code: "NOT_FOUND" });
  }

  await assignment.update({ status: "deactivated" });
  return buildAgentAssignmentData(assignment);
}
