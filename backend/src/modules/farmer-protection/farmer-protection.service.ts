import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
import { Op, UniqueConstraintError, type WhereOptions } from "sequelize";
import {
  AgentActivityLog,
  AgentProfile,
  AgentVerificationRecord,
  ComplaintEvidence,
  ComplaintInvestigation,
  CooperativeAgentAssignment,
  CooperativeProfile,
  FarmerActionApproval,
  FarmerAgentPermission,
  FarmerAgentRelationship,
  FarmerComplaint,
  FarmerConsentRecord,
  Offer,
  Order,
  OrderFeeDisclosure,
  ProduceListing,
  Role,
  User,
  UserRole,
  sequelize,
} from "../../database/models/index.js";
import { privateDocumentStorage } from "../../integrations/storage/index.js";
import { notifyAdmins } from "../../services/admin-users.service.js";
import {
  sanitizeSingleLineText,
  cleanOptionalText,
} from "../../utils/plain-text.js";
import { detectVerificationDocument } from "../verifications/verification-document-validation.js";
import { dispatchNotification } from "../notifications/notifications.service.js";
import { acceptOffer, rejectOffer } from "../offers/offers.service.js";
import { cancelOrder } from "../orders/orders.service.js";
import type {
  AgentPermissionKey,
  ApprovalActionType,
  CreateApprovalInput,
  CreateComplaintInput,
  CreateRelationshipInput,
  GrantConsentInput,
  InviteAgentInput,
  UpdateComplaintSchema,
} from "./farmer-protection.validation.js";
import { AGENT_PERMISSION_KEYS } from "./farmer-protection.validation.js";
import type { z } from "zod";
import type {
  AgentProfileData,
  AgentVerificationData,
  AuditLogData,
  ComplaintEvidenceData,
  ComplaintInvestigationData,
  FarmerActionApprovalData,
  FarmerAgentPermissionData,
  FarmerAgentRelationshipData,
  FarmerComplaintData,
  FarmerConsentRecordData,
  OrderFeeDisclosureData,
  Paginated,
} from "./farmer-protection.types.js";

type UpdateComplaintInput = z.infer<typeof UpdateComplaintSchema>;

const APPROVAL_PERMISSION: Record<ApprovalActionType, AgentPermissionKey> = {
  listing_price_change: "manage_listings",
  listing_quantity_change: "manage_listings",
  listing_publish: "manage_listings",
  offer_acceptance: "respond_to_offers",
  offer_rejection: "respond_to_offers",
  order_cancellation: "coordinate_orders",
  fee_disclosure: "coordinate_orders",
  payment_destination_change: "coordinate_orders",
};

const LISTING_ACTIONS: ApprovalActionType[] = [
  "listing_price_change",
  "listing_quantity_change",
  "listing_publish",
];

function serviceError(
  message: string,
  code: string,
  status = code === "NOT_FOUND" ? 404 : code === "FORBIDDEN" ? 403 : 422,
): Error {
  return Object.assign(new Error(message), { code, status });
}

function paginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
}

async function safeNotify(
  input: Parameters<typeof dispatchNotification>[0],
): Promise<void> {
  try {
    await dispatchNotification(input);
  } catch (error) {
    console.error("Farmer protection notification failed:", error);
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashProposedValues(value: Record<string, unknown>): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw serviceError("A valid numeric value is required.", "INVALID_OPERATION");
  }
  return parsed;
}

function buildAgentProfileData(row: AgentProfile): AgentProfileData {
  return {
    id: row.id,
    user_id: row.user_id,
    cooperative_id: row.cooperative_id,
    full_name: row.full_name,
    phone_number: row.phone_number,
    email: row.email ?? null,
    identity_verification_reference:
      row.identity_verification_reference ?? null,
    operating_area: row.operating_area ?? null,
    appointment_date: row.appointment_date ?? null,
    status: row.status ?? "invited",
    verification_status: row.verification_status ?? "pending",
    code_of_conduct_version: row.code_of_conduct_version ?? null,
    code_of_conduct_accepted_at: row.code_of_conduct_accepted_at ?? null,
    invited_by_user_id: row.invited_by_user_id,
    verified_by_user_id: row.verified_by_user_id ?? null,
    verified_at: row.verified_at ?? null,
    suspended_at: row.suspended_at ?? null,
    removed_at: row.removed_at ?? null,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

function buildAgentVerificationData(
  row: AgentVerificationRecord,
): AgentVerificationData {
  return {
    id: row.id,
    agent_profile_id: row.agent_profile_id,
    submitted_by_user_id: row.submitted_by_user_id,
    status: row.status ?? "pending",
    identity_reference: row.identity_reference ?? null,
    documents: Array.isArray(row.documents) ? row.documents : [],
    notes: row.notes ?? null,
    reviewed_by_user_id: row.reviewed_by_user_id ?? null,
    reviewed_at: row.reviewed_at ?? null,
    rejection_reason: row.rejection_reason ?? null,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

function buildPermissionData(
  row: FarmerAgentPermission,
): FarmerAgentPermissionData {
  return {
    id: row.id,
    relationship_id: row.relationship_id,
    permission_key: row.permission_key,
    is_granted: row.is_granted,
    granted_at: row.granted_at ?? null,
    revoked_at: row.revoked_at ?? null,
    granted_by_user_id: row.granted_by_user_id ?? null,
  };
}

function buildRelationshipData(
  row: FarmerAgentRelationship,
  permissions: FarmerAgentPermission[] = [],
): FarmerAgentRelationshipData {
  return {
    id: row.id,
    farmer_user_id: row.farmer_user_id,
    agent_user_id: row.agent_user_id,
    cooperative_id: row.cooperative_id,
    agent_profile_id: row.agent_profile_id ?? null,
    status: row.status ?? "pending",
    consent_method: row.consent_method ?? "in_app",
    requested_by_user_id: row.requested_by_user_id,
    consent_given_at: row.consent_given_at ?? null,
    consent_expires_at: row.consent_expires_at ?? null,
    consent_revoked_at: row.consent_revoked_at ?? null,
    revoked_by_user_id: row.revoked_by_user_id ?? null,
    rejection_reason: row.rejection_reason ?? null,
    permissions: permissions.map(buildPermissionData),
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

function buildConsentData(row: FarmerConsentRecord): FarmerConsentRecordData {
  return {
    id: row.id,
    relationship_id: row.relationship_id,
    farmer_user_id: row.farmer_user_id,
    agent_user_id: row.agent_user_id,
    cooperative_id: row.cooperative_id,
    action: row.action,
    method: row.method,
    ip_address: row.ip_address ?? null,
    user_agent: row.user_agent ?? null,
    metadata: row.metadata ?? null,
    created_at: row.created_at!,
  };
}

function buildApprovalData(row: FarmerActionApproval): FarmerActionApprovalData {
  return {
    id: row.id,
    farmer_user_id: row.farmer_user_id,
    agent_user_id: row.agent_user_id,
    cooperative_id: row.cooperative_id,
    relationship_id: row.relationship_id ?? null,
    action_type: row.action_type,
    resource_type: row.resource_type,
    resource_id: row.resource_id ?? null,
    previous_values: row.previous_values ?? null,
    proposed_values: row.proposed_values ?? {},
    proposed_values_hash: row.proposed_values_hash,
    approval_status: row.approval_status ?? "pending",
    approval_method: row.approval_method ?? "in_app",
    evidence_reference: row.evidence_reference ?? null,
    expires_at: row.expires_at,
    approved_at: row.approved_at ?? null,
    rejected_at: row.rejected_at ?? null,
    cancelled_at: row.cancelled_at ?? null,
    applied_at: row.applied_at ?? null,
    application_result: row.application_result ?? null,
    failure_reason: row.failure_reason ?? null,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

function buildEvidenceData(row: ComplaintEvidence): ComplaintEvidenceData {
  return {
    id: row.id,
    complaint_id: row.complaint_id,
    uploaded_by_user_id: row.uploaded_by_user_id,
    original_file_name: row.original_file_name,
    file_type: row.file_type,
    file_size_bytes: Number(row.file_size_bytes),
    description: row.description ?? null,
    checksum_sha256: row.checksum_sha256 ?? null,
    created_at: row.created_at!,
  };
}

function buildInvestigationData(
  row: ComplaintInvestigation,
): ComplaintInvestigationData {
  return {
    id: row.id,
    complaint_id: row.complaint_id,
    admin_user_id: row.admin_user_id,
    action: row.action,
    notes: row.notes ?? null,
    decision: row.decision ?? null,
    created_at: row.created_at!,
  };
}

function buildComplaintData(
  row: FarmerComplaint & {
    evidence?: ComplaintEvidence[];
    investigations?: ComplaintInvestigation[];
  },
): FarmerComplaintData {
  return {
    id: row.id,
    complaint_number: row.complaint_number,
    farmer_user_id: row.farmer_user_id,
    agent_user_id: row.agent_user_id ?? null,
    cooperative_id: row.cooperative_id ?? null,
    related_order_id: row.related_order_id ?? null,
    related_listing_id: row.related_listing_id ?? null,
    category: row.category,
    description: row.description,
    status: row.status ?? "submitted",
    priority: row.priority ?? "normal",
    assigned_admin_user_id: row.assigned_admin_user_id ?? null,
    resolution: row.resolution ?? null,
    resolved_at: row.resolved_at ?? null,
    evidence_count: row.evidence?.length,
    evidence: row.evidence?.map(buildEvidenceData),
    investigations: row.investigations?.map(buildInvestigationData),
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

function buildFeeDisclosureData(
  row: OrderFeeDisclosure,
): OrderFeeDisclosureData {
  return {
    id: row.id,
    order_id: row.order_id,
    cooperative_id: row.cooperative_id ?? null,
    agent_user_id: row.agent_user_id ?? null,
    fee_type: row.fee_type,
    amount_minor: String(row.amount_minor),
    currency: row.currency,
    description: row.description ?? null,
    disclosed_at: row.disclosed_at,
    agreed_by_farmer_user_id: row.agreed_by_farmer_user_id ?? null,
    agreed_at: row.agreed_at ?? null,
    farmer_approval_id: row.farmer_approval_id ?? null,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

function buildAuditData(row: AgentActivityLog): AuditLogData {
  return {
    id: row.id,
    agent_user_id: row.agent_user_id ?? null,
    farmer_user_id: row.farmer_user_id ?? null,
    cooperative_id: row.cooperative_id ?? null,
    action: row.action,
    description: row.description ?? null,
    resource_type: row.resource_type ?? null,
    resource_id: row.resource_id ?? null,
    approval_required: row.approval_required ?? false,
    approval_id: row.approval_id ?? null,
    approval_status: row.approval_status ?? null,
    action_result: row.action_result ?? null,
    metadata: row.metadata ?? null,
    created_at: row.created_at!,
  };
}

async function writeAudit(input: {
  agent_user_id?: string | null;
  farmer_user_id?: string | null;
  cooperative_id?: string | null;
  action: string;
  description?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  previous_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  approval_required?: boolean;
  approval_id?: string | null;
  approval_status?: string | null;
  action_result?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  await AgentActivityLog.create({
    agent_user_id: input.agent_user_id ?? null,
    farmer_user_id: input.farmer_user_id ?? null,
    cooperative_id: input.cooperative_id ?? null,
    action: input.action,
    description: input.description ?? null,
    metadata: input.metadata ?? null,
    resource_type: input.resource_type ?? null,
    resource_id: input.resource_id ?? null,
    previous_values: input.previous_values ?? null,
    new_values: input.new_values ?? null,
    approval_required: input.approval_required ?? false,
    approval_id: input.approval_id ?? null,
    approval_status: input.approval_status ?? null,
    action_result: input.action_result ?? null,
    created_at: new Date(),
  });
}

async function getUser(userId: string): Promise<User> {
  const user = await User.findByPk(userId);
  if (!user) {
    throw serviceError("User not found.", "NOT_FOUND");
  }
  return user;
}

async function getOwnedCooperative(
  cooperativeId: string,
  ownerUserId: string,
): Promise<CooperativeProfile> {
  const cooperative = await CooperativeProfile.findOne({
    where: { id: cooperativeId, registered_by_user_id: ownerUserId },
  });
  if (!cooperative) {
    throw serviceError(
      "Cooperative not found or you do not own it.",
      "NOT_FOUND",
    );
  }
  if (cooperative.verification_status !== "approved") {
    throw serviceError(
      "Only approved cooperatives can manage agents.",
      "INVALID_OPERATION",
    );
  }
  return cooperative;
}

async function getActiveAgentProfile(
  userId: string,
  cooperativeId: string,
): Promise<AgentProfile> {
  const profile = await AgentProfile.findOne({
    where: {
      user_id: userId,
      cooperative_id: cooperativeId,
      status: "active",
      verification_status: "approved",
    },
  });
  if (!profile) {
    throw serviceError(
      "An approved, active cooperative agent profile is required.",
      "FORBIDDEN",
      403,
    );
  }
  return profile;
}

async function getActiveRelationship(
  farmerUserId: string,
  agentUserId: string,
  cooperativeId: string,
): Promise<FarmerAgentRelationship> {
  const relationship = await FarmerAgentRelationship.findOne({
    where: {
      farmer_user_id: farmerUserId,
      agent_user_id: agentUserId,
      cooperative_id: cooperativeId,
      status: "active",
    },
  });
  if (!relationship) {
    throw serviceError(
      "An active farmer consent relationship is required.",
      "FORBIDDEN",
      403,
    );
  }
  if (
    relationship.consent_expires_at &&
    relationship.consent_expires_at.getTime() <= Date.now()
  ) {
    await relationship.update({ status: "expired" });
    throw serviceError(
      "The farmer consent relationship has expired.",
      "FORBIDDEN",
      403,
    );
  }
  return relationship;
}

async function assertPermission(
  relationshipId: string,
  permissionKey: AgentPermissionKey,
): Promise<void> {
  const permission = await FarmerAgentPermission.findOne({
    where: {
      relationship_id: relationshipId,
      permission_key: permissionKey,
      is_granted: true,
      revoked_at: null,
    },
  });
  if (!permission) {
    throw serviceError(
      `The farmer has not granted the '${permissionKey}' permission.`,
      "FORBIDDEN",
      403,
    );
  }
}

async function ensureAgentRole(userId: string): Promise<void> {
  const role = await Role.findOne({ where: { name: "cooperative_agent" } });
  if (!role) {
    throw serviceError("Cooperative agent role is not configured.", "CONFIG_ERROR", 500);
  }
  await UserRole.findOrCreate({
    where: { user_id: userId, role_id: role.id },
    defaults: { user_id: userId, role_id: role.id },
  });
}

async function ensureAgentAssignment(
  cooperativeId: string,
  agentUserId: string,
  assignedByUserId: string,
): Promise<void> {
  const existing = await CooperativeAgentAssignment.findOne({
    where: {
      cooperative_id: cooperativeId,
      agent_user_id: agentUserId,
      status: "active",
    },
  });
  if (!existing) {
    await CooperativeAgentAssignment.create({
      cooperative_id: cooperativeId,
      agent_user_id: agentUserId,
      assigned_by_user_id: assignedByUserId,
      status: "active",
      assigned_at: new Date(),
    });
  }
}

// ─── Cooperative agent invitation and verification ───────────────────────────

export async function inviteAgent(
  ownerUserId: string,
  cooperativeId: string,
  input: InviteAgentInput,
): Promise<AgentProfileData> {
  await getOwnedCooperative(cooperativeId, ownerUserId);
  const agentUser = await getUser(input.user_id);

  if (agentUser.id === ownerUserId) {
    throw serviceError(
      "A cooperative owner cannot invite themselves as an agent.",
      "INVALID_OPERATION",
    );
  }

  const existing = await AgentProfile.findOne({
    where: { user_id: input.user_id, cooperative_id: cooperativeId },
  });
  if (existing) {
    throw serviceError(
      "This user already has an agent profile for the cooperative.",
      "CONFLICT",
      409,
    );
  }

  const profile = await sequelize.transaction(async (transaction) => {
    const created = await AgentProfile.create(
      {
        user_id: input.user_id,
        cooperative_id: cooperativeId,
        full_name: input.full_name,
        phone_number: input.phone_number,
        email: input.email ?? null,
        operating_area: input.operating_area ?? null,
        appointment_date: input.appointment_date ?? null,
        status: "invited",
        verification_status: "pending",
        code_of_conduct_version: input.code_of_conduct_version ?? null,
        invited_by_user_id: ownerUserId,
      },
      { transaction },
    );

    await AgentVerificationRecord.create(
      {
        agent_profile_id: created.id,
        submitted_by_user_id: ownerUserId,
        status: "pending",
        notes: "Agent invited by cooperative. Verification is required.",
      },
      { transaction },
    );

    return created;
  });

  await writeAudit({
    agent_user_id: profile.user_id,
    cooperative_id: cooperativeId,
    action: "agent_invited",
    description: `Agent ${profile.full_name} invited by cooperative.`,
    resource_type: "agent_profile",
    resource_id: profile.id,
    action_result: "pending",
  });

  await safeNotify({
    user_id: profile.user_id,
    notification_type: "agent_invited",
    variables: {
      actor_name: agentUser.display_name ?? null,
    },
    related_entity_type: "agent_profile",
    related_entity_id: profile.id,
    action_url: "/agents/me",
    dedupe_key: `agent_invited:${profile.id}`,
  });

  await notifyAdmins({
    notification_type: "agent_invited",
    variables: { actor_name: profile.full_name },
    related_entity_type: "agent_profile",
    related_entity_id: profile.id,
    action_url: `/admin/farmer-protection/agents/${profile.id}`,
    dedupe_key_prefix: `agent_invited_admin:${profile.id}`,
  });

  return buildAgentProfileData(profile);
}

export async function listCooperativeAgentProfiles(
  ownerUserId: string,
  cooperativeId: string,
  page: number,
  limit: number,
  status?: string,
): Promise<Paginated<AgentProfileData>> {
  await getOwnedCooperative(cooperativeId, ownerUserId);
  const where: WhereOptions = { cooperative_id: cooperativeId };
  if (status) {
    (where as Record<string, unknown>)["status"] = status;
  }
  const { count, rows } = await AgentProfile.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });
  return {
    items: rows.map(buildAgentProfileData),
    ...paginationMeta(count, page, limit),
  };
}

export async function listAgentVerifications(
  agentProfileId: string,
  requesterUserId: string,
  isAdmin: boolean,
): Promise<AgentVerificationData[]> {
  const profile = await AgentProfile.findByPk(agentProfileId);
  if (!profile) {
    throw serviceError("Agent profile not found.", "NOT_FOUND");
  }
  if (!isAdmin) {
    const cooperative = await CooperativeProfile.findOne({
      where: {
        id: profile.cooperative_id,
        registered_by_user_id: requesterUserId,
      },
    });
    if (!cooperative) {
      throw serviceError(
        "You do not have permission to view this agent's verification.",
        "FORBIDDEN",
        403,
      );
    }
  }
  const rows = await AgentVerificationRecord.findAll({
    where: { agent_profile_id: agentProfileId },
    order: [["created_at", "DESC"]],
  });
  return rows.map(buildAgentVerificationData);
}

export async function adminListAgentProfiles(
  page: number,
  limit: number,
  status?: string,
  verificationStatus?: string,
): Promise<Paginated<AgentProfileData>> {
  const where: WhereOptions = {};
  if (status) (where as Record<string, unknown>)["status"] = status;
  if (verificationStatus) {
    (where as Record<string, unknown>)["verification_status"] =
      verificationStatus;
  }
  const { count, rows } = await AgentProfile.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });
  return {
    items: rows.map(buildAgentProfileData),
    ...paginationMeta(count, page, limit),
  };
}

export async function adminReviewAgentVerification(
  adminUserId: string,
  agentProfileId: string,
  status: "approved" | "rejected",
  notes?: string,
): Promise<AgentProfileData> {
  const profile = await AgentProfile.findByPk(agentProfileId);
  if (!profile) {
    throw serviceError("Agent profile not found.", "NOT_FOUND");
  }

  const approved = status === "approved";
  await sequelize.transaction(async (transaction) => {
    await profile.update(
      {
        status: approved ? "active" : "removed",
        verification_status: approved ? "approved" : "rejected",
        verified_by_user_id: adminUserId,
        verified_at: approved ? new Date() : null,
        removed_at: approved ? null : new Date(),
      },
      { transaction },
    );

    const latest = await AgentVerificationRecord.findOne({
      where: { agent_profile_id: profile.id },
      order: [["created_at", "DESC"]],
      transaction,
    });
    if (latest) {
      await latest.update(
        {
          status: approved ? "approved" : "rejected",
          reviewed_by_user_id: adminUserId,
          reviewed_at: new Date(),
          rejection_reason: approved ? null : notes ?? null,
        },
        { transaction },
      );
    } else {
      await AgentVerificationRecord.create(
        {
          agent_profile_id: profile.id,
          submitted_by_user_id: profile.invited_by_user_id,
          status: approved ? "approved" : "rejected",
          reviewed_by_user_id: adminUserId,
          reviewed_at: new Date(),
          rejection_reason: approved ? null : notes ?? null,
        },
        { transaction },
      );
    }

    if (approved) {
      await ensureAgentRole(profile.user_id);
      await ensureAgentAssignment(
        profile.cooperative_id,
        profile.user_id,
        adminUserId,
      );
    }
  });

  await writeAudit({
    agent_user_id: profile.user_id,
    cooperative_id: profile.cooperative_id,
    action: approved
      ? "agent_verification_approved"
      : "agent_verification_rejected",
    description: notes ?? null,
    resource_type: "agent_profile",
    resource_id: profile.id,
    action_result: status,
  });

  await safeNotify({
    user_id: profile.user_id,
    notification_type: approved
      ? "agent_verification_approved"
      : "agent_verification_rejected",
    variables: { reason: notes ?? null },
    related_entity_type: "agent_profile",
    related_entity_id: profile.id,
    action_url: "/agents/me",
    dedupe_key: `agent_verification:${profile.id}:${status}`,
  });

  return buildAgentProfileData(profile);
}

export async function adminSuspendAgent(
  adminUserId: string,
  agentProfileId: string,
  reason: string,
): Promise<AgentProfileData> {
  const profile = await AgentProfile.findByPk(agentProfileId);
  if (!profile) {
    throw serviceError("Agent profile not found.", "NOT_FOUND");
  }

  await sequelize.transaction(async (transaction) => {
    await profile.update(
      {
        status: "suspended",
        verification_status: "suspended",
        suspended_at: new Date(),
      },
      { transaction },
    );
    await CooperativeAgentAssignment.update(
      { status: "deactivated" },
      {
        where: {
          cooperative_id: profile.cooperative_id,
          agent_user_id: profile.user_id,
        },
        transaction,
      },
    );
    await FarmerAgentRelationship.update(
      { status: "suspended" },
      {
        where: {
          agent_user_id: profile.user_id,
          cooperative_id: profile.cooperative_id,
          status: "active",
        },
        transaction,
      },
    );
  });

  await writeAudit({
    agent_user_id: profile.user_id,
    cooperative_id: profile.cooperative_id,
    action: "agent_suspended",
    description: reason,
    resource_type: "agent_profile",
    resource_id: profile.id,
    action_result: "suspended",
  });

  return buildAgentProfileData(profile);
}

// ─── Farmer consent relationships ────────────────────────────────────────────

export async function createRelationship(
  actorUserId: string,
  actorRole: "farmer" | "agent",
  input: CreateRelationshipInput,
): Promise<FarmerAgentRelationshipData> {
  const farmerUserId =
    actorRole === "farmer" ? actorUserId : input.farmer_user_id;
  const agentUserId =
    actorRole === "agent" ? actorUserId : input.agent_user_id;

  if (!farmerUserId || !agentUserId) {
    throw serviceError(
      "Both the farmer and agent must be identified.",
      "INVALID_OPERATION",
    );
  }
  if (farmerUserId === agentUserId) {
    throw serviceError(
      "A farmer cannot be their own agent.",
      "INVALID_OPERATION",
    );
  }

  const cooperative = await CooperativeProfile.findByPk(input.cooperative_id);
  if (!cooperative || cooperative.verification_status !== "approved") {
    throw serviceError(
      "An approved cooperative is required.",
      "INVALID_OPERATION",
    );
  }

  const agentProfile = await getActiveAgentProfile(
    agentUserId,
    input.cooperative_id,
  );

  const existing = await FarmerAgentRelationship.findOne({
    where: {
      farmer_user_id: farmerUserId,
      agent_user_id: agentUserId,
      cooperative_id: input.cooperative_id,
      status: { [Op.in]: ["pending", "active", "suspended"] },
    },
  });
  if (existing) {
    throw serviceError(
      "An open relationship already exists for this farmer and agent.",
      "CONFLICT",
      409,
    );
  }

  const relationship = await FarmerAgentRelationship.create({
    farmer_user_id: farmerUserId,
    agent_user_id: agentUserId,
    cooperative_id: input.cooperative_id,
    agent_profile_id: agentProfile.id,
    status: "pending",
    consent_method: "in_app",
    requested_by_user_id: actorUserId,
    consent_expires_at: input.expires_at ?? null,
  });

  for (const permissionKey of input.permissions ?? []) {
    await FarmerAgentPermission.create({
      relationship_id: relationship.id,
      permission_key: permissionKey,
      is_granted: false,
    });
  }

  await writeAudit({
    agent_user_id: agentUserId,
    farmer_user_id: farmerUserId,
    cooperative_id: input.cooperative_id,
    action: "agent_relationship_requested",
    description: "Farmer consent requested for cooperative agent access.",
    resource_type: "farmer_agent_relationship",
    resource_id: relationship.id,
    action_result: "pending",
  });

  await safeNotify({
    user_id: farmerUserId,
    notification_type: "agent_relationship_requested",
    variables: { actor_name: agentProfile.full_name },
    related_entity_type: "farmer_agent_relationship",
    related_entity_id: relationship.id,
    action_url: `/farmers/me/agent-relationships`,
    dedupe_key: `relationship_requested:${relationship.id}:${farmerUserId}`,
  });

  const permissions = await FarmerAgentPermission.findAll({
    where: { relationship_id: relationship.id },
  });
  return buildRelationshipData(relationship, permissions);
}

export async function listFarmerRelationships(
  farmerUserId: string,
): Promise<FarmerAgentRelationshipData[]> {
  const rows = await FarmerAgentRelationship.findAll({
    where: { farmer_user_id: farmerUserId },
    include: [
      {
        model: FarmerAgentPermission,
        as: "permissions",
        required: false,
      },
    ],
    order: [["created_at", "DESC"]],
  });
  return rows.map((row) =>
    buildRelationshipData(
      row,
      (row.get("permissions") as FarmerAgentPermission[] | undefined) ?? [],
    ),
  );
}

export async function listAgentRelationships(
  agentUserId: string,
): Promise<FarmerAgentRelationshipData[]> {
  const rows = await FarmerAgentRelationship.findAll({
    where: { agent_user_id: agentUserId },
    include: [
      {
        model: FarmerAgentPermission,
        as: "permissions",
        required: false,
      },
    ],
    order: [["created_at", "DESC"]],
  });
  return rows.map((row) =>
    buildRelationshipData(
      row,
      (row.get("permissions") as FarmerAgentPermission[] | undefined) ?? [],
    ),
  );
}

export async function listCooperativeRelationships(
  ownerUserId: string,
  cooperativeId: string,
  page: number,
  limit: number,
): Promise<Paginated<FarmerAgentRelationshipData>> {
  await getOwnedCooperative(cooperativeId, ownerUserId);
  const { count, rows } = await FarmerAgentRelationship.findAndCountAll({
    where: { cooperative_id: cooperativeId },
    include: [
      {
        model: FarmerAgentPermission,
        as: "permissions",
        required: false,
      },
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });
  return {
    items: rows.map((row) =>
      buildRelationshipData(
        row,
        (row.get("permissions") as FarmerAgentPermission[] | undefined) ?? [],
      ),
    ),
    ...paginationMeta(count, page, limit),
  };
}

export async function grantConsent(
  farmerUserId: string,
  relationshipId: string,
  input: GrantConsentInput,
  requestContext: { ip?: string | null; userAgent?: string | null } = {},
): Promise<FarmerAgentRelationshipData> {
  const relationship = await FarmerAgentRelationship.findOne({
    where: { id: relationshipId, farmer_user_id: farmerUserId },
  });
  if (!relationship) {
    throw serviceError("Relationship not found.", "NOT_FOUND");
  }
  if (!["pending", "active"].includes(relationship.status ?? "")) {
    throw serviceError(
      `Consent cannot be granted for a ${relationship.status} relationship.`,
      "INVALID_OPERATION",
    );
  }
  if (
    relationship.consent_expires_at &&
    relationship.consent_expires_at.getTime() <= Date.now()
  ) {
    await relationship.update({ status: "expired" });
    throw serviceError("The consent request has expired.", "INVALID_OPERATION");
  }

  await sequelize.transaction(async (transaction) => {
    await relationship.update(
      {
        status: "active",
        consent_method: input.method,
        consent_given_at: relationship.consent_given_at ?? new Date(),
        consent_expires_at: input.expires_at ?? relationship.consent_expires_at,
      },
      { transaction },
    );

    for (const permissionKey of input.permissions) {
      const [permission] = await FarmerAgentPermission.findOrCreate({
        where: {
          relationship_id: relationship.id,
          permission_key: permissionKey,
        },
        defaults: {
          relationship_id: relationship.id,
          permission_key: permissionKey,
          is_granted: true,
          granted_at: new Date(),
          granted_by_user_id: farmerUserId,
        },
        transaction,
      });
      if (!permission.is_granted) {
        await permission.update(
          {
            is_granted: true,
            granted_at: new Date(),
            revoked_at: null,
            granted_by_user_id: farmerUserId,
          },
          { transaction },
        );
      }
    }

    await FarmerConsentRecord.create(
      {
        relationship_id: relationship.id,
        farmer_user_id: relationship.farmer_user_id,
        agent_user_id: relationship.agent_user_id,
        cooperative_id: relationship.cooperative_id,
        action: "consent_granted",
        method: input.method,
        ip_address: requestContext.ip ?? null,
        user_agent: requestContext.userAgent ?? null,
        metadata: { permissions: input.permissions },
        created_at: new Date(),
      },
      { transaction },
    );
  });

  await writeAudit({
    agent_user_id: relationship.agent_user_id,
    farmer_user_id: relationship.farmer_user_id,
    cooperative_id: relationship.cooperative_id,
    action: "farmer_consent_granted",
    description: "Farmer granted agent permissions.",
    resource_type: "farmer_agent_relationship",
    resource_id: relationship.id,
    new_values: { permissions: input.permissions },
    action_result: "active",
  });

  await safeNotify({
    user_id: relationship.agent_user_id,
    notification_type: "agent_relationship_approved",
    variables: {
      actor_name:
        (
          await User.findByPk(relationship.farmer_user_id, {
            attributes: ["display_name"],
          })
        )?.display_name ?? null,
    },
    related_entity_type: "farmer_agent_relationship",
    related_entity_id: relationship.id,
    action_url: "/agents/me/relationships",
    dedupe_key: `relationship_consent:${relationship.id}`,
  });

  const permissions = await FarmerAgentPermission.findAll({
    where: { relationship_id: relationship.id },
  });
  return buildRelationshipData(relationship, permissions);
}

export async function revokeRelationship(
  farmerUserId: string,
  relationshipId: string,
  reason: string,
  requestContext: { ip?: string | null; userAgent?: string | null } = {},
): Promise<FarmerAgentRelationshipData> {
  const relationship = await FarmerAgentRelationship.findOne({
    where: { id: relationshipId, farmer_user_id: farmerUserId },
  });
  if (!relationship) {
    throw serviceError("Relationship not found.", "NOT_FOUND");
  }
  if (["revoked", "expired", "rejected"].includes(relationship.status ?? "")) {
    throw serviceError(
      `The relationship is already ${relationship.status}.`,
      "INVALID_OPERATION",
    );
  }

  await sequelize.transaction(async (transaction) => {
    await relationship.update(
      {
        status: "revoked",
        consent_revoked_at: new Date(),
        revoked_by_user_id: farmerUserId,
        rejection_reason: reason,
      },
      { transaction },
    );
    await FarmerAgentPermission.update(
      { is_granted: false, revoked_at: new Date() },
      { where: { relationship_id: relationship.id }, transaction },
    );
    await FarmerConsentRecord.create(
      {
        relationship_id: relationship.id,
        farmer_user_id: relationship.farmer_user_id,
        agent_user_id: relationship.agent_user_id,
        cooperative_id: relationship.cooperative_id,
        action: "consent_revoked",
        method: "in_app",
        ip_address: requestContext.ip ?? null,
        user_agent: requestContext.userAgent ?? null,
        metadata: { reason },
        created_at: new Date(),
      },
      { transaction },
    );
  });

  await writeAudit({
    agent_user_id: relationship.agent_user_id,
    farmer_user_id: relationship.farmer_user_id,
    cooperative_id: relationship.cooperative_id,
    action: "farmer_consent_revoked",
    description: reason,
    resource_type: "farmer_agent_relationship",
    resource_id: relationship.id,
    action_result: "revoked",
  });

  await safeNotify({
    user_id: relationship.agent_user_id,
    notification_type: "agent_relationship_revoked",
    variables: { reason },
    related_entity_type: "farmer_agent_relationship",
    related_entity_id: relationship.id,
    action_url: "/agents/me/relationships",
    dedupe_key: `relationship_revoked:${relationship.id}`,
  });

  return buildRelationshipData(relationship);
}

export async function listConsentRecords(
  farmerUserId: string,
): Promise<FarmerConsentRecordData[]> {
  const rows = await FarmerConsentRecord.findAll({
    where: { farmer_user_id: farmerUserId },
    order: [["created_at", "DESC"]],
  });
  return rows.map(buildConsentData);
}

// ─── Farmer approvals ────────────────────────────────────────────────────────

async function resolveApprovalResource(
  farmerUserId: string,
  input: CreateApprovalInput,
): Promise<Record<string, unknown>> {
  if (input.action_type === "payment_destination_change") {
    throw serviceError(
      "Payment destination changes are not supported by this workflow.",
      "INVALID_OPERATION",
    );
  }

  if (LISTING_ACTIONS.includes(input.action_type)) {
    if (!input.resource_id) {
      throw serviceError("A listing ID is required.", "INVALID_OPERATION");
    }
    const listing = await ProduceListing.findOne({
      where: { id: input.resource_id, farmer_user_id: farmerUserId },
    });
    if (!listing) {
      throw serviceError("Listing not found for this farmer.", "NOT_FOUND");
    }
    return {
      price_per_unit: Number(listing.price_per_unit),
      quantity: Number(listing.quantity),
      available_quantity: Number(listing.available_quantity),
      reserved_quantity: Number(listing.reserved_quantity),
      sold_quantity: Number(listing.sold_quantity),
      status: listing.status,
    };
  }

  if (
    input.action_type === "offer_acceptance" ||
    input.action_type === "offer_rejection"
  ) {
    if (!input.resource_id) {
      throw serviceError("An offer ID is required.", "INVALID_OPERATION");
    }
    const offer = await Offer.findOne({
      where: { id: input.resource_id, farmer_id: farmerUserId },
    });
    if (!offer) {
      throw serviceError("Offer not found for this farmer.", "NOT_FOUND");
    }
    return {
      status: offer.status,
      quantity: Number(offer.quantity),
      unit_price: Number(offer.unit_price),
      total_amount: Number(offer.total_amount),
    };
  }

  if (
    input.action_type === "order_cancellation" ||
    input.action_type === "fee_disclosure"
  ) {
    if (!input.resource_id) {
      throw serviceError("An order ID is required.", "INVALID_OPERATION");
    }
    const order = await Order.findOne({
      where: { id: input.resource_id, farmer_id: farmerUserId },
    });
    if (!order) {
      throw serviceError("Order not found for this farmer.", "NOT_FOUND");
    }
    return {
      status: order.status,
      payment_status: order.payment_status,
      total_amount: Number(order.total_amount),
      currency: order.currency,
    };
  }

  throw serviceError("Unsupported approval action.", "INVALID_OPERATION");
}

export async function requestApproval(
  agentUserId: string,
  input: CreateApprovalInput,
): Promise<FarmerActionApprovalData> {
  const relationship = input.relationship_id
    ? await FarmerAgentRelationship.findOne({
        where: {
          id: input.relationship_id,
          agent_user_id: agentUserId,
          farmer_user_id: input.farmer_user_id,
          cooperative_id: input.cooperative_id,
          status: "active",
        },
      })
    : await getActiveRelationship(
        input.farmer_user_id,
        agentUserId,
        input.cooperative_id,
      );

  if (!relationship) {
    throw serviceError(
      "An active farmer consent relationship is required.",
      "FORBIDDEN",
      403,
    );
  }

  await assertPermission(
    relationship.id,
    APPROVAL_PERMISSION[input.action_type],
  );

  const previousValues =
    input.previous_values ??
    (await resolveApprovalResource(input.farmer_user_id, input));
  const proposedValuesHash = hashProposedValues(input.proposed_values);
  const existing = await FarmerActionApproval.findOne({
    where: { idempotency_key: input.idempotency_key },
  });
  if (existing) {
    if (
      existing.agent_user_id === agentUserId &&
      existing.proposed_values_hash === proposedValuesHash
    ) {
      return buildApprovalData(existing);
    }
    throw serviceError(
      "The idempotency key has already been used for a different request.",
      "CONFLICT",
      409,
    );
  }

  let approval: FarmerActionApproval;
  try {
    approval = await FarmerActionApproval.create({
      farmer_user_id: input.farmer_user_id,
      agent_user_id: agentUserId,
      cooperative_id: input.cooperative_id,
      relationship_id: relationship.id,
      action_type: input.action_type,
      resource_type: input.resource_type,
      resource_id: input.resource_id ?? null,
      previous_values: previousValues,
      proposed_values: input.proposed_values,
      proposed_values_hash: proposedValuesHash,
      approval_status: "pending",
      approval_method: "in_app",
      expires_at: new Date(
        Date.now() + input.expires_in_minutes * 60 * 1000,
      ),
      idempotency_key: input.idempotency_key,
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw serviceError(
        "The idempotency key has already been used.",
        "CONFLICT",
        409,
      );
    }
    throw error;
  }

  await writeAudit({
    agent_user_id: agentUserId,
    farmer_user_id: input.farmer_user_id,
    cooperative_id: input.cooperative_id,
    action: "action_approval_requested",
    description: `Approval requested for ${input.action_type}.`,
    resource_type: input.resource_type,
    resource_id: input.resource_id ?? approval.id,
    previous_values: previousValues,
    new_values: input.proposed_values,
    approval_required: true,
    approval_id: approval.id,
    approval_status: "pending",
    action_result: "pending",
  });

  const agent = await getUser(agentUserId);
  await safeNotify({
    user_id: input.farmer_user_id,
    notification_type: "action_approval_requested",
    variables: {
      actor_name: agent.display_name ?? null,
      action_type: input.action_type,
      approval_id: approval.id,
    },
    related_entity_type: "farmer_action_approval",
    related_entity_id: approval.id,
    action_url: "/farmers/me/approvals",
    dedupe_key: `approval_requested:${approval.id}`,
  });

  return buildApprovalData(approval);
}

export async function listFarmerApprovals(
  farmerUserId: string,
  status?: string,
): Promise<FarmerActionApprovalData[]> {
  const where: WhereOptions = { farmer_user_id: farmerUserId };
  if (status) (where as Record<string, unknown>)["approval_status"] = status;
  const rows = await FarmerActionApproval.findAll({
    where,
    order: [["created_at", "DESC"]],
  });
  return rows.map(buildApprovalData);
}

export async function listAgentApprovals(
  agentUserId: string,
  status?: string,
): Promise<FarmerActionApprovalData[]> {
  const where: WhereOptions = { agent_user_id: agentUserId };
  if (status) (where as Record<string, unknown>)["approval_status"] = status;
  const rows = await FarmerActionApproval.findAll({
    where,
    order: [["created_at", "DESC"]],
  });
  return rows.map(buildApprovalData);
}

async function applyApprovedAction(
  approval: FarmerActionApproval,
): Promise<Record<string, unknown>> {
  const proposed = approval.proposed_values ?? {};
  const resourceId = approval.resource_id;
  if (!resourceId) {
    throw serviceError("The approval has no target resource.", "INVALID_OPERATION");
  }

  if (approval.action_type === "listing_price_change") {
    return sequelize.transaction(async (transaction) => {
      const listing = await ProduceListing.findOne({
        where: {
          id: resourceId,
          farmer_user_id: approval.farmer_user_id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!listing) throw serviceError("Listing not found.", "NOT_FOUND");
      const price = numberValue(proposed["price_per_unit"]);
      if (price < 0) {
        throw serviceError("Price cannot be negative.", "INVALID_OPERATION");
      }
      await listing.update({ price_per_unit: price }, { transaction });
      return { listing_id: listing.id, price_per_unit: price };
    });
  }

  if (approval.action_type === "listing_quantity_change") {
    return sequelize.transaction(async (transaction) => {
      const listing = await ProduceListing.findOne({
        where: {
          id: resourceId,
          farmer_user_id: approval.farmer_user_id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!listing) throw serviceError("Listing not found.", "NOT_FOUND");
      const quantity = numberValue(proposed["quantity"]);
      const reserved = Number(listing.reserved_quantity);
      const sold = Number(listing.sold_quantity);
      const available = quantity - reserved - sold;
      if (quantity <= 0 || available < 0) {
        throw serviceError(
          "Quantity must be positive and cannot be lower than reserved plus sold stock.",
          "INVALID_OPERATION",
        );
      }
      await listing.update(
        { quantity, available_quantity: available },
        { transaction },
      );
      return {
        listing_id: listing.id,
        quantity,
        available_quantity: available,
      };
    });
  }

  if (approval.action_type === "listing_publish") {
    return sequelize.transaction(async (transaction) => {
      const listing = await ProduceListing.findOne({
        where: {
          id: resourceId,
          farmer_user_id: approval.farmer_user_id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!listing) throw serviceError("Listing not found.", "NOT_FOUND");
      if (!["draft", "paused"].includes(listing.status ?? "")) {
        throw serviceError(
          "Only draft or paused listings can be published.",
          "INVALID_OPERATION",
        );
      }
      if (
        Number(listing.available_quantity) <= 0 ||
        Number(listing.price_per_unit) < 0
      ) {
        throw serviceError(
          "Listing must have available quantity and a valid price.",
          "INVALID_OPERATION",
        );
      }
      await listing.update({ status: "published" }, { transaction });
      return { listing_id: listing.id, status: "published" };
    });
  }

  if (
    approval.action_type === "offer_acceptance" ||
    approval.action_type === "offer_rejection"
  ) {
    const result =
      approval.action_type === "offer_acceptance"
        ? await acceptOffer(approval.farmer_user_id, resourceId)
        : await rejectOffer(approval.farmer_user_id, resourceId);
    return { offer_id: result.id, status: result.status };
  }

  if (approval.action_type === "order_cancellation") {
    const reason =
      typeof proposed["reason"] === "string" && proposed["reason"].trim()
        ? proposed["reason"]
        : "Cancelled after farmer approval.";
    const result = await cancelOrder(approval.farmer_user_id, resourceId, {
      reason,
    });
    return { order_id: result.id, status: result.status };
  }

  if (approval.action_type === "fee_disclosure") {
    return sequelize.transaction(async (transaction) => {
      const order = await Order.findOne({
        where: {
          id: resourceId,
          farmer_id: approval.farmer_user_id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!order) throw serviceError("Order not found.", "NOT_FOUND");
      const amountMinor = numberValue(proposed["amount_minor"]);
      if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
        throw serviceError(
          "A positive integer amount in minor units is required.",
          "INVALID_OPERATION",
        );
      }
      const disclosure = await OrderFeeDisclosure.create(
        {
          order_id: order.id,
          cooperative_id: approval.cooperative_id,
          agent_user_id: approval.agent_user_id,
          fee_type:
            (proposed["fee_type"] as OrderFeeDisclosure["fee_type"]) ??
            "agent_service_fee",
          amount_minor: String(amountMinor),
          currency:
            typeof proposed["currency"] === "string"
              ? proposed["currency"]
              : order.currency,
          description:
            typeof proposed["description"] === "string"
              ? proposed["description"]
              : null,
          disclosed_at: new Date(),
          agreed_by_farmer_user_id: approval.farmer_user_id,
          agreed_at: new Date(),
          farmer_approval_id: approval.id,
        },
        { transaction },
      );
      return {
        order_id: order.id,
        fee_disclosure_id: disclosure.id,
        amount_minor: disclosure.amount_minor,
      };
    });
  }

  throw serviceError("Unsupported approval action.", "INVALID_OPERATION");
}

export async function decideApproval(
  farmerUserId: string,
  approvalId: string,
  decision: "approve" | "reject",
  note?: string,
): Promise<FarmerActionApprovalData> {
  const approval = await FarmerActionApproval.findOne({
    where: { id: approvalId, farmer_user_id: farmerUserId },
  });
  if (!approval) {
    throw serviceError("Approval request not found.", "NOT_FOUND");
  }
  if (approval.approval_status !== "pending") {
    throw serviceError(
      `This approval is already ${approval.approval_status}.`,
      "INVALID_OPERATION",
    );
  }
  if (approval.expires_at.getTime() <= Date.now()) {
    await approval.update({ approval_status: "expired" });
    await writeAudit({
      agent_user_id: approval.agent_user_id,
      farmer_user_id: approval.farmer_user_id,
      cooperative_id: approval.cooperative_id,
      action: "action_approval_expired",
      resource_type: approval.resource_type,
      resource_id: approval.resource_id,
      approval_required: true,
      approval_id: approval.id,
      approval_status: "expired",
      action_result: "expired",
    });
    await safeNotify({
      user_id: approval.agent_user_id,
      notification_type: "action_approval_expired",
      variables: { action_type: approval.action_type },
      related_entity_type: "farmer_action_approval",
      related_entity_id: approval.id,
      action_url: "/agents/me/approvals",
      dedupe_key: `approval_expired:${approval.id}`,
    });
    throw serviceError("The approval request has expired.", "INVALID_OPERATION");
  }

  if (decision === "reject") {
    await approval.update({
      approval_status: "rejected",
      rejected_at: new Date(),
      failure_reason: note ?? null,
    });
    await writeAudit({
      agent_user_id: approval.agent_user_id,
      farmer_user_id: approval.farmer_user_id,
      cooperative_id: approval.cooperative_id,
      action: "action_approval_rejected",
      description: note ?? null,
      resource_type: approval.resource_type,
      resource_id: approval.resource_id,
      approval_required: true,
      approval_id: approval.id,
      approval_status: "rejected",
      action_result: "rejected",
    });
    await safeNotify({
      user_id: approval.agent_user_id,
      notification_type: "action_rejected",
      variables: { action_type: approval.action_type, reason: note ?? null },
      related_entity_type: "farmer_action_approval",
      related_entity_id: approval.id,
      action_url: "/agents/me/approvals",
      dedupe_key: `approval_rejected:${approval.id}`,
    });
    return buildApprovalData(approval);
  }

  await approval.update({
    approval_status: "approved",
    approved_at: new Date(),
  });

  try {
    const result = await applyApprovedAction(approval);
    await approval.update({
      applied_at: new Date(),
      application_result: result,
      failure_reason: null,
    });
    await writeAudit({
      agent_user_id: approval.agent_user_id,
      farmer_user_id: approval.farmer_user_id,
      cooperative_id: approval.cooperative_id,
      action: "action_approval_applied",
      description: `Approved action ${approval.action_type} applied.`,
      resource_type: approval.resource_type,
      resource_id: approval.resource_id,
      previous_values: approval.previous_values,
      new_values: approval.proposed_values,
      approval_required: true,
      approval_id: approval.id,
      approval_status: "approved",
      action_result: "applied",
    });
    await safeNotify({
      user_id: approval.agent_user_id,
      notification_type: "action_approved",
      variables: { action_type: approval.action_type },
      related_entity_type: "farmer_action_approval",
      related_entity_id: approval.id,
      action_url: "/agents/me/approvals",
      dedupe_key: `approval_applied:${approval.id}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The approved action failed.";
    await approval.update({ failure_reason: message });
    await writeAudit({
      agent_user_id: approval.agent_user_id,
      farmer_user_id: approval.farmer_user_id,
      cooperative_id: approval.cooperative_id,
      action: "action_approval_application_failed",
      description: message,
      resource_type: approval.resource_type,
      resource_id: approval.resource_id,
      approval_required: true,
      approval_id: approval.id,
      approval_status: "approved",
      action_result: "failed",
    });
  }

  return buildApprovalData(approval);
}

// ─── Complaints ──────────────────────────────────────────────────────────────

function complaintNumber(): string {
  return `CMP-${Date.now().toString(36).toUpperCase()}-${randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
}

export async function createComplaint(
  farmerUserId: string,
  input: CreateComplaintInput,
): Promise<FarmerComplaintData> {
  if (input.related_order_id) {
    const order = await Order.findOne({
      where: { id: input.related_order_id, farmer_id: farmerUserId },
    });
    if (!order) {
      throw serviceError("Related order not found for this farmer.", "NOT_FOUND");
    }
  }
  if (input.related_listing_id) {
    const listing = await ProduceListing.findOne({
      where: { id: input.related_listing_id, farmer_user_id: farmerUserId },
    });
    if (!listing) {
      throw serviceError(
        "Related listing not found for this farmer.",
        "NOT_FOUND",
      );
    }
  }
  if (input.cooperative_id) {
    const cooperative = await CooperativeProfile.findByPk(input.cooperative_id);
    if (!cooperative) {
      throw serviceError("Cooperative not found.", "NOT_FOUND");
    }
  }

  const complaint = await FarmerComplaint.create({
    complaint_number: complaintNumber(),
    farmer_user_id: farmerUserId,
    agent_user_id: input.agent_user_id ?? null,
    cooperative_id: input.cooperative_id ?? null,
    related_order_id: input.related_order_id ?? null,
    related_listing_id: input.related_listing_id ?? null,
    category: input.category,
    description: input.description,
    status: "submitted",
    priority: input.priority,
  });

  await writeAudit({
    agent_user_id: input.agent_user_id ?? null,
    farmer_user_id: farmerUserId,
    cooperative_id: input.cooperative_id ?? null,
    action: "complaint_submitted",
    description: `Complaint ${complaint.complaint_number} submitted.`,
    resource_type: "farmer_complaint",
    resource_id: complaint.id,
    action_result: "submitted",
  });

  await safeNotify({
    user_id: farmerUserId,
    notification_type: "complaint_submitted",
    variables: { complaint_number: complaint.complaint_number },
    related_entity_type: "farmer_complaint",
    related_entity_id: complaint.id,
    action_url: `/farmers/me/complaints/${complaint.id}`,
    dedupe_key: `complaint_submitted:${complaint.id}`,
  });

  await notifyAdmins({
    notification_type: "complaint_submitted",
    variables: { complaint_number: complaint.complaint_number },
    related_entity_type: "farmer_complaint",
    related_entity_id: complaint.id,
    action_url: `/admin/farmer-protection/complaints/${complaint.id}`,
    dedupe_key_prefix: `complaint_admin:${complaint.id}`,
  });

  return buildComplaintData(complaint);
}

export async function listFarmerComplaints(
  farmerUserId: string,
  page: number,
  limit: number,
): Promise<Paginated<FarmerComplaintData>> {
  const { count, rows } = await FarmerComplaint.findAndCountAll({
    where: { farmer_user_id: farmerUserId },
    order: [["created_at", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });
  return {
    items: rows.map(buildComplaintData),
    ...paginationMeta(count, page, limit),
  };
}

export async function getComplaint(
  requesterUserId: string,
  complaintId: string,
  isAdmin: boolean,
): Promise<FarmerComplaintData> {
  const complaint = await FarmerComplaint.findOne({
    where: isAdmin
      ? { id: complaintId }
      : { id: complaintId, farmer_user_id: requesterUserId },
    include: [
      { model: ComplaintEvidence, as: "evidence", required: false },
      {
        model: ComplaintInvestigation,
        as: "investigations",
        required: false,
        separate: true,
        order: [["created_at", "ASC"]],
      },
    ],
  });
  if (!complaint) {
    throw serviceError("Complaint not found.", "NOT_FOUND");
  }
  return buildComplaintData(complaint);
}

export async function addComplaintEvidence(
  farmerUserId: string,
  complaintId: string,
  file: Express.Multer.File,
  description?: string,
): Promise<ComplaintEvidenceData> {
  const complaint = await FarmerComplaint.findOne({
    where: { id: complaintId, farmer_user_id: farmerUserId },
  });
  if (!complaint) {
    throw serviceError("Complaint not found.", "NOT_FOUND");
  }
  if (["resolved", "dismissed"].includes(complaint.status ?? "")) {
    throw serviceError(
      "Evidence cannot be added to a closed complaint.",
      "INVALID_OPERATION",
    );
  }

  const detected = detectVerificationDocument(file.buffer);
  if (!detected) {
    throw serviceError(
      "Unsupported document type. Upload a PDF, JPEG, PNG or WebP file.",
      "INVALID_OPERATION",
    );
  }

  const originalFileName =
    sanitizeSingleLineText(path.basename(file.originalname)).slice(0, 255) ||
    `complaint-evidence.${detected.extension}`;
  const checksum = createHash("sha256").update(file.buffer).digest("hex");
  const stored = await privateDocumentStorage.saveDocument({
    verificationId: `complaints/${complaint.id}`,
    buffer: file.buffer,
    extension: detected.extension,
  });

  try {
    const evidence = await ComplaintEvidence.create({
      complaint_id: complaint.id,
      uploaded_by_user_id: farmerUserId,
      file_reference: stored.storageKey,
      original_file_name: originalFileName,
      file_type: detected.mimeType,
      file_size_bytes: file.size,
      description: cleanOptionalText(description) ?? null,
      checksum_sha256: checksum,
    });
    return buildEvidenceData(evidence);
  } catch (error) {
    await privateDocumentStorage
      .deleteDocument(stored.storageKey)
      .catch((cleanupError) =>
        console.error("Failed to clean up orphaned complaint evidence:", cleanupError),
      );
    throw error;
  }
}

export async function readComplaintEvidence(
  requesterUserId: string,
  complaintId: string,
  evidenceId: string,
  isAdmin: boolean,
): Promise<{ buffer: Buffer; evidence: ComplaintEvidenceData }> {
  const complaint = await FarmerComplaint.findOne({
    where: isAdmin
      ? { id: complaintId }
      : { id: complaintId, farmer_user_id: requesterUserId },
  });
  if (!complaint) {
    throw serviceError("Complaint not found.", "NOT_FOUND");
  }
  const evidence = await ComplaintEvidence.findOne({
    where: { id: evidenceId, complaint_id: complaintId },
  });
  if (!evidence) {
    throw serviceError("Evidence not found.", "NOT_FOUND");
  }
  return {
    buffer: await privateDocumentStorage.readDocument(evidence.file_reference),
    evidence: buildEvidenceData(evidence),
  };
}

export async function adminListComplaints(
  page: number,
  limit: number,
  status?: string,
): Promise<Paginated<FarmerComplaintData>> {
  const where: WhereOptions = {};
  if (status) (where as Record<string, unknown>)["status"] = status;
  const { count, rows } = await FarmerComplaint.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });
  return {
    items: rows.map(buildComplaintData),
    ...paginationMeta(count, page, limit),
  };
}

export async function adminUpdateComplaint(
  adminUserId: string,
  complaintId: string,
  input: UpdateComplaintInput,
): Promise<FarmerComplaintData> {
  const complaint = await FarmerComplaint.findByPk(complaintId);
  if (!complaint) {
    throw serviceError("Complaint not found.", "NOT_FOUND");
  }

  const previousStatus = complaint.status;
  await sequelize.transaction(async (transaction) => {
    const update: Partial<FarmerComplaint> = {};
    if (input.status) update.status = input.status;
    if (input.priority) update.priority = input.priority;
    if (input.assigned_admin_user_id) {
      update.assigned_admin_user_id = input.assigned_admin_user_id;
    }
    if (input.resolution !== undefined) update.resolution = input.resolution;
    if (input.status === "resolved") update.resolved_at = new Date();
    if (input.status === "dismissed") update.resolved_at = new Date();
    await complaint.update(update, { transaction });

    await ComplaintInvestigation.create(
      {
        complaint_id: complaint.id,
        admin_user_id: adminUserId,
        action: input.status ? "status_updated" : "note_added",
        notes: input.notes ?? null,
        decision: input.status ?? null,
        created_at: new Date(),
      },
      { transaction },
    );
  });

  await writeAudit({
    agent_user_id: complaint.agent_user_id ?? null,
    farmer_user_id: complaint.farmer_user_id,
    cooperative_id: complaint.cooperative_id ?? null,
    action: "complaint_updated",
    description: input.notes ?? null,
    resource_type: "farmer_complaint",
    resource_id: complaint.id,
    previous_values: { status: previousStatus },
    new_values: { status: complaint.status, priority: complaint.priority },
    action_result: complaint.status,
  });

  await safeNotify({
    user_id: complaint.farmer_user_id,
    notification_type:
      complaint.status === "resolved"
        ? "complaint_resolved"
        : "complaint_status_updated",
    variables: {
      complaint_number: complaint.complaint_number,
      reason: complaint.status,
    },
    related_entity_type: "farmer_complaint",
    related_entity_id: complaint.id,
    action_url: `/farmers/me/complaints/${complaint.id}`,
    dedupe_key: `complaint_status:${complaint.id}:${complaint.status}:${Date.now()}`,
  });

  return buildComplaintData(complaint);
}

export async function addComplaintInvestigation(
  adminUserId: string,
  complaintId: string,
  action: string,
  notes?: string,
  decision?: string,
): Promise<void> {
  const complaint = await FarmerComplaint.findByPk(complaintId);
  if (!complaint) {
    throw serviceError("Complaint not found.", "NOT_FOUND");
  }
  await ComplaintInvestigation.create({
    complaint_id: complaint.id,
    admin_user_id: adminUserId,
    action,
    notes: notes ?? null,
    decision: decision ?? null,
    created_at: new Date(),
  });
  await writeAudit({
    agent_user_id: complaint.agent_user_id ?? null,
    farmer_user_id: complaint.farmer_user_id,
    cooperative_id: complaint.cooperative_id ?? null,
    action: "complaint_investigation_note_added",
    description: notes ?? null,
    resource_type: "farmer_complaint",
    resource_id: complaint.id,
    new_values: { investigation_action: action, decision: decision ?? null },
    action_result: "recorded",
  });
}

// ─── Audit and fee disclosures ───────────────────────────────────────────────

export async function listAuditLogs(
  where: WhereOptions,
  page: number,
  limit: number,
): Promise<Paginated<AuditLogData>> {
  const { count, rows } = await AgentActivityLog.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });
  return {
    items: rows.map(buildAuditData),
    ...paginationMeta(count, page, limit),
  };
}

export async function listCooperativeAuditLogs(
  ownerUserId: string,
  cooperativeId: string,
  page: number,
  limit: number,
): Promise<Paginated<AuditLogData>> {
  await getOwnedCooperative(cooperativeId, ownerUserId);
  return listAuditLogs({ cooperative_id: cooperativeId }, page, limit);
}

export async function listOrderFeeDisclosures(
  requesterUserId: string,
  orderId: string,
  isAdmin: boolean,
): Promise<OrderFeeDisclosureData[]> {
  const order = await Order.findOne({
    where: isAdmin ? { id: orderId } : { id: orderId, farmer_id: requesterUserId },
  });
  if (!order) {
    throw serviceError("Order not found.", "NOT_FOUND");
  }
  const rows = await OrderFeeDisclosure.findAll({
    where: { order_id: orderId },
    order: [["created_at", "ASC"]],
  });
  return rows.map(buildFeeDisclosureData);
}

export { AGENT_PERMISSION_KEYS };
