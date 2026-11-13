import { randomBytes } from "node:crypto";
import { Op, QueryTypes, type WhereOptions } from "sequelize";
import {
  PilotConfiguration,
  PilotFeedback,
  PilotParticipant,
  User,
  sequelize,
} from "../../database/models/index.js";
import type { PilotConfigurationStatus } from "../../database/models/pilot-configuration.model.js";
import type {
  AddPilotParticipantInput,
  CreatePilotConfigurationInput,
  CreatePilotFeedbackInput,
  ListPilotConfigurationsInput,
  ListPilotFeedbackInput,
  ListPilotParticipantsInput,
  ReadinessOverrideInput,
  UpdatePilotConfigurationInput,
  UpdatePilotFeedbackInput,
  UpdatePilotParticipantInput,
} from "./pilot.validation.js";
import { readinessModuleKeys } from "./pilot.readiness.catalog.js";
import {
  buildReadinessReport,
  getActivePilotConfigurationRow,
  getPilotReadinessReport,
} from "./pilot.readiness.service.js";
import {
  toPilotConfigurationData,
  toPilotFeedbackData,
  toPilotParticipantData,
} from "./pilot.serializers.js";
import type {
  Paginated,
  PilotConfigurationData,
  PilotFeedbackData,
  PilotMetrics,
  PilotParticipantData,
  PilotReadinessReport,
} from "./pilot.types.js";

function serviceError(message: string, code: string, status: number): Error {
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

function feedbackNumber(): string {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `PF-${day}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function feedbackWhere(
  input: ListPilotFeedbackInput,
  userId?: string,
): WhereOptions {
  const where: Record<string | symbol, unknown> = {};
  if (userId) where.user_id = userId;
  if (input.status) where.status = input.status;
  if (input.category) where.category = input.category;
  if (input.severity) where.severity = input.severity;
  if (!userId && input.user_id) where.user_id = input.user_id;

  if (input.from || input.to) {
    const createdAt: Record<symbol, Date> = {};
    if (input.from) createdAt[Op.gte] = input.from;
    if (input.to) createdAt[Op.lte] = input.to;
    where.created_at = createdAt;
  }

  return where as WhereOptions;
}

async function countQuery(
  sql: string,
  replacements: Record<string, unknown> = {},
): Promise<number> {
  const rows = (await sequelize.query(sql, {
    replacements,
    type: QueryTypes.SELECT,
  })) as Array<Record<string, unknown>>;
  return Number(rows[0]?.count ?? 0);
}

async function scalarQuery(
  sql: string,
  replacements: Record<string, unknown> = {},
): Promise<number> {
  const rows = (await sequelize.query(sql, {
    replacements,
    type: QueryTypes.SELECT,
  })) as Array<Record<string, unknown>>;
  const value = rows[0]?.value ?? 0;
  return Number(value);
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 10000) / 10000;
}

function metricWindow(configuration: PilotConfiguration): {
  start: Date;
  end: Date;
  reportedStart: Date | null;
  reportedEnd: Date | null;
} {
  const reportedStart = configuration.start_date
    ? new Date(`${configuration.start_date}T00:00:00.000Z`)
    : null;
  const reportedEnd = configuration.end_date
    ? new Date(`${configuration.end_date}T23:59:59.999Z`)
    : null;

  return {
    start: reportedStart ?? new Date(0),
    end: reportedEnd ?? new Date("9999-12-31T23:59:59.999Z"),
    reportedStart,
    reportedEnd,
  };
}

export async function listPilotConfigurations(
  input: ListPilotConfigurationsInput,
): Promise<Paginated<PilotConfigurationData>> {
  const where: WhereOptions = {};
  if (input.status) {
    where.status = input.status;
  }

  const { rows, count } = await PilotConfiguration.findAndCountAll({
    where,
    order: [
      ["is_active", "DESC"],
      ["created_at", "DESC"],
    ],
    offset: (input.page - 1) * input.limit,
    limit: input.limit,
  });

  return {
    items: rows.map(toPilotConfigurationData),
    pagination: paginationMeta(count, input.page, input.limit),
  };
}

export async function getActivePilotConfiguration(): Promise<PilotConfigurationData | null> {
  const row = await getActivePilotConfigurationRow();
  return row ? toPilotConfigurationData(row) : null;
}

export async function getPilotConfiguration(
  id: string,
): Promise<PilotConfigurationData> {
  const row = await PilotConfiguration.findByPk(id);
  if (!row) {
    throw serviceError("Pilot configuration not found.", "NOT_FOUND", 404);
  }
  return toPilotConfigurationData(row);
}

export async function createPilotConfiguration(
  input: CreatePilotConfigurationInput,
  adminUserId: string,
): Promise<PilotConfigurationData> {
  const status: PilotConfigurationStatus =
    input.status ?? (input.is_active ? "active" : "draft");
  const isActive = input.is_active || status === "active";

  const row = await sequelize.transaction(async (transaction) => {
    if (isActive) {
      await PilotConfiguration.update(
        { is_active: false },
        { where: { is_active: true }, transaction },
      );
    }
    return PilotConfiguration.create(
      {
        name: input.name,
        status,
        country: input.country,
        state_or_region: input.state_or_region,
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
        locations: input.locations,
        produce_category_ids: input.produce_category_ids,
        notes: input.notes ?? null,
        is_active: isActive,
        created_by_user_id: adminUserId,
      },
      { transaction },
    );
  });

  return toPilotConfigurationData(row);
}

export async function updatePilotConfiguration(
  id: string,
  input: UpdatePilotConfigurationInput,
): Promise<PilotConfigurationData> {
  const row = await PilotConfiguration.findByPk(id);
  if (!row) {
    throw serviceError("Pilot configuration not found.", "NOT_FOUND", 404);
  }

  if (input.start_date !== undefined) row.start_date = input.start_date;
  if (input.end_date !== undefined) row.end_date = input.end_date;
  if (
    row.start_date &&
    row.end_date &&
    row.start_date > row.end_date
  ) {
    throw serviceError(
      "End date must be on or after the start date.",
      "INVALID_OPERATION",
      422,
    );
  }

  if (input.name !== undefined) row.name = input.name;
  if (input.country !== undefined) row.country = input.country;
  if (input.state_or_region !== undefined) {
    row.state_or_region = input.state_or_region;
  }
  if (input.locations !== undefined) row.locations = input.locations;
  if (input.produce_category_ids !== undefined) {
    row.produce_category_ids = input.produce_category_ids;
  }
  if (input.notes !== undefined) row.notes = input.notes;
  if (input.status !== undefined) row.status = input.status;
  if (input.is_active !== undefined) row.is_active = input.is_active;
  if (input.status === "active" && input.is_active === undefined) {
    row.is_active = true;
  }
  if (
    input.is_active === undefined &&
    row.status !== "active" &&
    row.status !== "paused"
  ) {
    row.is_active = false;
  }

  await sequelize.transaction(async (transaction) => {
    if (row.is_active) {
      await PilotConfiguration.update(
        { is_active: false },
        {
          where: { is_active: true, id: { [Op.ne]: row.id } },
          transaction,
        },
      );
    }
    await row.save({ transaction });
  });

  return toPilotConfigurationData(row);
}

export async function listPilotParticipants(
  configurationId: string,
  input: ListPilotParticipantsInput,
): Promise<Paginated<PilotParticipantData>> {
  await getPilotConfiguration(configurationId);

  const where: WhereOptions = {
    pilot_configuration_id: configurationId,
  };
  if (input.status) where.status = input.status;
  if (input.participant_type) {
    where.participant_type = input.participant_type;
  }

  const { rows, count } = await PilotParticipant.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    offset: (input.page - 1) * input.limit,
    limit: input.limit,
  });

  return {
    items: rows.map(toPilotParticipantData),
    pagination: paginationMeta(count, input.page, input.limit),
  };
}

export async function addPilotParticipant(
  configurationId: string,
  input: AddPilotParticipantInput,
  adminUserId: string,
): Promise<PilotParticipantData> {
  await getPilotConfiguration(configurationId);

  const user = await User.findByPk(input.user_id);
  if (!user) {
    throw serviceError("User not found.", "NOT_FOUND", 404);
  }

  const existing = await PilotParticipant.findOne({
    where: {
      pilot_configuration_id: configurationId,
      user_id: input.user_id,
    },
  });
  if (existing) {
    throw serviceError(
      "This user is already a participant in the pilot.",
      "CONFLICT",
      409,
    );
  }

  let status = input.status;
  if (!input.consent_confirmed && ["approved", "active"].includes(status)) {
    status = "pending_consent";
  }
  if (
    input.consent_confirmed &&
    ["invited", "pending_consent"].includes(status)
  ) {
    status = "approved";
  }

  const row = await PilotParticipant.create({
    pilot_configuration_id: configurationId,
    user_id: input.user_id,
    participant_type: input.participant_type,
    status,
    consent_given_at: input.consent_confirmed ? new Date() : null,
    consent_version: input.consent_confirmed
      ? (input.consent_version ?? "pilot-consent-v1")
      : null,
    approved_by_user_id:
      input.consent_confirmed && ["approved", "active"].includes(status)
        ? adminUserId
        : null,
    approved_at:
      input.consent_confirmed && ["approved", "active"].includes(status)
        ? new Date()
        : null,
    notes: input.notes ?? null,
  });

  return toPilotParticipantData(row);
}

export async function updatePilotParticipant(
  configurationId: string,
  participantId: string,
  input: UpdatePilotParticipantInput,
  adminUserId: string,
): Promise<PilotParticipantData> {
  const row = await PilotParticipant.findOne({
    where: { id: participantId, pilot_configuration_id: configurationId },
  });
  if (!row) {
    throw serviceError("Pilot participant not found.", "NOT_FOUND", 404);
  }

  if (input.consent_confirmed === true) {
    row.consent_given_at = row.consent_given_at ?? new Date();
    row.consent_version =
      input.consent_version ?? row.consent_version ?? "pilot-consent-v1";
  }
  if (input.consent_confirmed === false) {
    row.consent_given_at = null;
    row.consent_version = null;
    if (
      ["approved", "active"].includes(input.status ?? row.status)
    ) {
      row.status = "pending_consent";
    }
  }

  if (input.status !== undefined) {
    if (
      ["approved", "active"].includes(input.status) &&
      !row.consent_given_at
    ) {
      throw serviceError(
        "Consent must be recorded before a participant can be approved or active.",
        "INVALID_OPERATION",
        422,
      );
    }
    row.status = input.status;
    if (["approved", "active"].includes(input.status) && !row.approved_at) {
      row.approved_by_user_id = adminUserId;
      row.approved_at = new Date();
    }
  }

  if (input.notes !== undefined) row.notes = input.notes;

  await row.save();
  return toPilotParticipantData(row);
}

export async function updateReadinessOverride(
  configurationId: string,
  moduleKey: string,
  input: ReadinessOverrideInput,
  adminUserId: string,
): Promise<PilotReadinessReport> {
  if (!readinessModuleKeys().includes(moduleKey)) {
    throw serviceError(
      "Unknown readiness module.",
      "NOT_FOUND",
      404,
    );
  }

  const row = await PilotConfiguration.findByPk(configurationId);
  if (!row) {
    throw serviceError("Pilot configuration not found.", "NOT_FOUND", 404);
  }

  const overrides = { ...(row.readiness_overrides ?? {}) };
  overrides[moduleKey] = {
    ...(overrides[moduleKey] ?? {}),
    ...input,
    reviewed_by_user_id: adminUserId,
    reviewed_at: new Date().toISOString(),
  };
  row.readiness_overrides = overrides;
  await row.save();

  return buildReadinessReport(toPilotConfigurationData(row));
}

export async function getReadinessReport(): Promise<PilotReadinessReport> {
  return getPilotReadinessReport();
}

async function getActiveParticipation(userId: string): Promise<{
  configuration: PilotConfiguration;
  participant: PilotParticipant;
}> {
  const configuration = await getActivePilotConfigurationRow();
  if (!configuration) {
    throw serviceError(
      "No active pilot is configured.",
      "INVALID_OPERATION",
      422,
    );
  }

  const participant = await PilotParticipant.findOne({
    where: {
      pilot_configuration_id: configuration.id,
      user_id: userId,
      status: { [Op.in]: ["approved", "active"] },
    },
  });
  if (!participant) {
    throw serviceError(
      "You are not an approved participant in the active pilot.",
      "FORBIDDEN",
      403,
    );
  }

  return { configuration, participant };
}

export async function getMyPilotParticipation(userId: string): Promise<{
  configuration: PilotConfigurationData;
  participant: PilotParticipantData;
}> {
  const { configuration, participant } = await getActiveParticipation(userId);
  return {
    configuration: toPilotConfigurationData(configuration),
    participant: toPilotParticipantData(participant),
  };
}

export async function submitPilotFeedback(
  userId: string,
  input: CreatePilotFeedbackInput,
): Promise<PilotFeedbackData> {
  const { configuration, participant } = await getActiveParticipation(userId);

  const row = await PilotFeedback.create({
    feedback_number: feedbackNumber(),
    pilot_configuration_id: configuration.id,
    user_id: userId,
    participant_type: participant.participant_type,
    category: input.category,
    description: input.description,
    severity: input.severity,
    related_complaint_id: input.related_complaint_id ?? null,
  });

  return toPilotFeedbackData(row);
}

export async function listMyPilotFeedback(
  userId: string,
  input: ListPilotFeedbackInput,
): Promise<Paginated<PilotFeedbackData>> {
  const where = feedbackWhere(input, userId);

  const { rows, count } = await PilotFeedback.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    offset: (input.page - 1) * input.limit,
    limit: input.limit,
  });

  return {
    items: rows.map(toPilotFeedbackData),
    pagination: paginationMeta(count, input.page, input.limit),
  };
}

export async function getMyPilotFeedback(
  userId: string,
  feedbackId: string,
): Promise<PilotFeedbackData> {
  const row = await PilotFeedback.findOne({
    where: { id: feedbackId, user_id: userId },
  });
  if (!row) {
    throw serviceError("Pilot feedback not found.", "NOT_FOUND", 404);
  }
  return toPilotFeedbackData(row);
}

export async function listPilotFeedback(
  input: ListPilotFeedbackInput,
): Promise<Paginated<PilotFeedbackData>> {
  const where = feedbackWhere(input);

  const { rows, count } = await PilotFeedback.findAndCountAll({
    where,
    order: [
      ["severity", "DESC"],
      ["created_at", "DESC"],
    ],
    offset: (input.page - 1) * input.limit,
    limit: input.limit,
  });

  return {
    items: rows.map(toPilotFeedbackData),
    pagination: paginationMeta(count, input.page, input.limit),
  };
}

export async function getPilotFeedback(
  feedbackId: string,
): Promise<PilotFeedbackData> {
  const row = await PilotFeedback.findByPk(feedbackId);
  if (!row) {
    throw serviceError("Pilot feedback not found.", "NOT_FOUND", 404);
  }
  return toPilotFeedbackData(row);
}

export async function updatePilotFeedback(
  feedbackId: string,
  input: UpdatePilotFeedbackInput,
): Promise<PilotFeedbackData> {
  const row = await PilotFeedback.findByPk(feedbackId);
  if (!row) {
    throw serviceError("Pilot feedback not found.", "NOT_FOUND", 404);
  }

  if (input.status !== undefined) {
    row.status = input.status;
    if (["resolved", "closed"].includes(input.status)) {
      row.resolved_at = row.resolved_at ?? new Date();
    } else {
      row.resolved_at = null;
    }
  }
  if (input.severity !== undefined) row.severity = input.severity;
  if (input.assigned_admin_user_id !== undefined) {
    row.assigned_admin_user_id = input.assigned_admin_user_id;
  }
  if (input.resolution_notes !== undefined) {
    row.resolution_notes = input.resolution_notes;
  }
  if (input.related_complaint_id !== undefined) {
    row.related_complaint_id = input.related_complaint_id;
  }

  await row.save();
  return toPilotFeedbackData(row);
}

export async function getPilotMetrics(
  configurationId: string,
): Promise<PilotMetrics> {
  const configuration = await PilotConfiguration.findByPk(configurationId);
  if (!configuration) {
    throw serviceError("Pilot configuration not found.", "NOT_FOUND", 404);
  }

  const window = metricWindow(configuration);
  const replacements = {
    start: window.start,
    end: window.end,
    configuration_id: configuration.id,
  };

  const registeredFarmers = await countQuery(
    "SELECT COUNT(*)::int AS count FROM farmer_profiles",
  );
  const verifiedFarmers = await countQuery(
    "SELECT COUNT(*)::int AS count FROM farmer_profiles WHERE verification_status = 'verified'",
  );
  const activeFarmers = await countQuery(
    `SELECT COUNT(*)::int AS count FROM (
       SELECT farmer_user_id AS user_id FROM produce_listings WHERE created_at BETWEEN :start AND :end
       UNION
       SELECT farmer_id AS user_id FROM offers WHERE created_at BETWEEN :start AND :end
       UNION
       SELECT farmer_id AS user_id FROM orders WHERE created_at BETWEEN :start AND :end
     ) active_farmers`,
    replacements,
  );
  const farmersReceivedEnquiries = await countQuery(
    "SELECT COUNT(DISTINCT farmer_id)::int AS count FROM offers WHERE created_at BETWEEN :start AND :end",
    replacements,
  );
  const farmersCompleted = await countQuery(
    `SELECT COUNT(DISTINCT farmer_id)::int AS count FROM orders
     WHERE status IN ('delivered', 'completed') AND created_at BETWEEN :start AND :end`,
    replacements,
  );
  const farmersViaUssd = await countQuery(
    "SELECT COUNT(DISTINCT user_id)::int AS count FROM ussd_sessions WHERE user_id IS NOT NULL AND started_at BETWEEN :start AND :end",
    replacements,
  );
  const farmersViaVoice = await countQuery(
    "SELECT COUNT(DISTINCT user_id)::int AS count FROM voice_call_sessions WHERE user_id IS NOT NULL AND started_at BETWEEN :start AND :end",
    replacements,
  );

  const registeredBuyers = await countQuery(
    `SELECT COUNT(DISTINCT ur.user_id)::int AS count
     FROM user_roles ur JOIN roles r ON r.id = ur.role_id
     WHERE r.name = 'buyer'`,
  );
  const activeBuyers = await countQuery(
    `SELECT COUNT(*)::int AS count FROM (
       SELECT buyer_user_id AS user_id FROM buyer_requests WHERE created_at BETWEEN :start AND :end
       UNION
       SELECT buyer_id AS user_id FROM offers WHERE created_at BETWEEN :start AND :end
       UNION
       SELECT buyer_id AS user_id FROM orders WHERE created_at BETWEEN :start AND :end
     ) active_buyers`,
    replacements,
  );
  const buyerRequests = await countQuery(
    "SELECT COUNT(*)::int AS count FROM buyer_requests WHERE created_at BETWEEN :start AND :end",
    replacements,
  );
  const buyerOffers = await countQuery(
    "SELECT COUNT(*)::int AS count FROM offers WHERE created_at BETWEEN :start AND :end",
    replacements,
  );
  const buyerOffersAccepted = await countQuery(
    "SELECT COUNT(*)::int AS count FROM offers WHERE status = 'accepted' AND created_at BETWEEN :start AND :end",
    replacements,
  );
  const buyersCompleted = await countQuery(
    `SELECT COUNT(DISTINCT buyer_id)::int AS count FROM orders
     WHERE status IN ('delivered', 'completed') AND created_at BETWEEN :start AND :end`,
    replacements,
  );

  const activeListings = await countQuery(
    "SELECT COUNT(*)::int AS count FROM produce_listings WHERE status = 'published' AND available_quantity > 0",
  );
  const availableQuantity = await scalarQuery(
    "SELECT COALESCE(SUM(available_quantity), 0)::float AS value FROM produce_listings WHERE status = 'published'",
  );
  const totalOffers = await countQuery(
    "SELECT COUNT(*)::int AS count FROM offers WHERE created_at BETWEEN :start AND :end",
    replacements,
  );
  const acceptedOffers = await countQuery(
    "SELECT COUNT(*)::int AS count FROM offers WHERE status = 'accepted' AND created_at BETWEEN :start AND :end",
    replacements,
  );
  const completedOrders = await countQuery(
    `SELECT COUNT(*)::int AS count FROM orders
     WHERE status IN ('delivered', 'completed') AND created_at BETWEEN :start AND :end`,
    replacements,
  );
  const totalOrders = await countQuery(
    "SELECT COUNT(*)::int AS count FROM orders WHERE created_at BETWEEN :start AND :end",
    replacements,
  );
  const paidTransactionValue = await scalarQuery(
    `SELECT COALESCE(SUM(total_amount), 0)::float AS value FROM orders
     WHERE status IN ('delivered', 'completed') AND payment_status = 'paid'
       AND created_at BETWEEN :start AND :end`,
    replacements,
  );
  const successfulPayments = await countQuery(
    "SELECT COUNT(*)::int AS count FROM payments WHERE status = 'success' AND created_at BETWEEN :start AND :end",
    replacements,
  );
  const failedPayments = await countQuery(
    `SELECT COUNT(*)::int AS count FROM payments
     WHERE status IN ('failed', 'abandoned') AND created_at BETWEEN :start AND :end`,
    replacements,
  );
  const totalReservations = await countQuery(
    "SELECT COUNT(*)::int AS count FROM inventory_reservations WHERE created_at BETWEEN :start AND :end",
    replacements,
  );
  const expiredReservations = await countQuery(
    "SELECT COUNT(*)::int AS count FROM inventory_reservations WHERE status = 'expired' AND created_at BETWEEN :start AND :end",
    replacements,
  );

  const ussdSessionsStarted = await countQuery(
    "SELECT COUNT(*)::int AS count FROM ussd_sessions WHERE started_at BETWEEN :start AND :end",
    replacements,
  );
  const ussdSessionsCompleted = await countQuery(
    "SELECT COUNT(*)::int AS count FROM ussd_sessions WHERE status = 'completed' AND started_at BETWEEN :start AND :end",
    replacements,
  );
  const ussdListingStarted = await countQuery(
    `SELECT COUNT(DISTINCT ussd_session_id)::int AS count FROM ussd_session_events
     WHERE menu_key LIKE 'farmer_sell%' AND created_at BETWEEN :start AND :end`,
    replacements,
  );
  const ussdListingCompleted = await countQuery(
    `SELECT COUNT(DISTINCT ussd_session_id)::int AS count FROM ussd_session_events
     WHERE menu_key = 'farmer_sell_confirm' AND response_type = 'END'
       AND created_at BETWEEN :start AND :end`,
    replacements,
  );
  const voiceCallsCompleted = await countQuery(
    "SELECT COUNT(*)::int AS count FROM voice_call_sessions WHERE status = 'completed' AND started_at BETWEEN :start AND :end",
    replacements,
  );
  const usersCreated = await countQuery(
    "SELECT COUNT(*)::int AS count FROM users WHERE created_at BETWEEN :start AND :end",
    replacements,
  );
  const usersActivated = await countQuery(
    "SELECT COUNT(*)::int AS count FROM users WHERE status = 'active' AND created_at BETWEEN :start AND :end",
    replacements,
  );
  const supportRequests = await countQuery(
    "SELECT COUNT(*)::int AS count FROM telecom_support_requests WHERE created_at BETWEEN :start AND :end",
    replacements,
  );
  const pilotFeedbackReceived = await countQuery(
    "SELECT COUNT(*)::int AS count FROM pilot_feedback WHERE created_at BETWEEN :start AND :end",
    replacements,
  );

  const activeCooperativeAgents = await countQuery(
    "SELECT COUNT(*)::int AS count FROM agent_profiles WHERE status = 'active'",
  );
  const activeAgentRelationships = await countQuery(
    "SELECT COUNT(*)::int AS count FROM farmer_agent_relationships WHERE status = 'active'",
  );
  const consentRevocations = await countQuery(
    `SELECT COUNT(*)::int AS count FROM farmer_consent_records
     WHERE action = 'consent_revoked' AND created_at BETWEEN :start AND :end`,
    replacements,
  );
  const complaintsSubmitted = await countQuery(
    "SELECT COUNT(*)::int AS count FROM farmer_complaints WHERE created_at BETWEEN :start AND :end",
    replacements,
  );
  const complaintsResolved = await countQuery(
    `SELECT COUNT(*)::int AS count FROM farmer_complaints
     WHERE status IN ('resolved', 'dismissed') AND resolved_at BETWEEN :start AND :end`,
    replacements,
  );
  const criticalFeedbackOpen = await countQuery(
    `SELECT COUNT(*)::int AS count FROM pilot_feedback
     WHERE severity = 'critical' AND status NOT IN ('resolved', 'closed')
       AND created_at BETWEEN :start AND :end`,
    replacements,
  );

  const invitedParticipants = await countQuery(
    "SELECT COUNT(*)::int AS count FROM pilot_participants WHERE pilot_configuration_id = :configuration_id AND status = 'invited'",
    replacements,
  );
  const approvedParticipants = await countQuery(
    "SELECT COUNT(*)::int AS count FROM pilot_participants WHERE pilot_configuration_id = :configuration_id AND status = 'approved'",
    replacements,
  );
  const activeParticipants = await countQuery(
    "SELECT COUNT(*)::int AS count FROM pilot_participants WHERE pilot_configuration_id = :configuration_id AND status = 'active'",
    replacements,
  );
  const suspendedParticipants = await countQuery(
    "SELECT COUNT(*)::int AS count FROM pilot_participants WHERE pilot_configuration_id = :configuration_id AND status = 'suspended'",
    replacements,
  );
  const removedParticipants = await countQuery(
    "SELECT COUNT(*)::int AS count FROM pilot_participants WHERE pilot_configuration_id = :configuration_id AND status = 'removed'",
    replacements,
  );

  return {
    pilot_configuration_id: configuration.id,
    generated_at: new Date(),
    window: {
      start: window.reportedStart,
      end: window.reportedEnd,
      timezone: "Africa/Lagos",
    },
    farmers: {
      registered: registeredFarmers,
      verified: verifiedFarmers,
      active: activeFarmers,
      received_enquiries: farmersReceivedEnquiries,
      completed_transactions: farmersCompleted,
      via_ussd: farmersViaUssd,
      via_voice: farmersViaVoice,
    },
    buyers: {
      registered: registeredBuyers,
      active: activeBuyers,
      requests_created: buyerRequests,
      offers_made: buyerOffers,
      offers_accepted: buyerOffersAccepted,
      completed_transactions: buyersCompleted,
    },
    marketplace: {
      active_listings: activeListings,
      available_quantity: availableQuantity,
      total_offers: totalOffers,
      accepted_offers: acceptedOffers,
      completed_orders: completedOrders,
      paid_transaction_value: paidTransactionValue,
      average_order_value:
        completedOrders > 0
          ? Math.round((paidTransactionValue / completedOrders) * 100) / 100
          : 0,
      order_completion_rate: ratio(completedOrders, totalOrders),
      payment_success_rate: ratio(
        successfulPayments,
        successfulPayments + failedPayments,
      ),
      reservation_expiry_rate: ratio(
        expiredReservations,
        totalReservations,
      ),
    },
    accessibility: {
      ussd_sessions_started: ussdSessionsStarted,
      ussd_sessions_completed: ussdSessionsCompleted,
      ussd_listing_flow_started: ussdListingStarted,
      ussd_listing_flow_completed: ussdListingCompleted,
      ussd_listing_completion_rate: ratio(
        ussdListingCompleted,
        ussdListingStarted,
      ),
      voice_calls_completed: voiceCallsCompleted,
      registration_completion_rate: ratio(
        usersActivated,
        usersCreated,
      ),
      support_requests: supportRequests,
      pilot_feedback_received: pilotFeedbackReceived,
    },
    trust: {
      active_cooperative_agents: activeCooperativeAgents,
      active_agent_relationships: activeAgentRelationships,
      consent_revocations: consentRevocations,
      complaints_submitted: complaintsSubmitted,
      complaints_resolved: complaintsResolved,
      feedback_critical_open: criticalFeedbackOpen,
    },
    participation: {
      invited: invitedParticipants,
      approved: approvedParticipants,
      active: activeParticipants,
      suspended: suspendedParticipants,
      removed: removedParticipants,
    },
  };
}
