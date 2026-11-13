import type { PilotConfiguration } from "../../database/models/pilot-configuration.model.js";
import type { PilotFeedback } from "../../database/models/pilot-feedback.model.js";
import type { PilotParticipant } from "../../database/models/pilot-participant.model.js";
import type {
  PilotConfigurationData,
  PilotFeedbackData,
  PilotParticipantData,
} from "./pilot.types.js";

export function toPilotConfigurationData(
  row: PilotConfiguration,
): PilotConfigurationData {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    country: row.country,
    state_or_region: row.state_or_region,
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    locations: Array.isArray(row.locations) ? row.locations : [],
    produce_category_ids: Array.isArray(row.produce_category_ids)
      ? row.produce_category_ids
      : [],
    readiness_overrides:
      row.readiness_overrides && typeof row.readiness_overrides === "object"
        ? row.readiness_overrides
        : {},
    notes: row.notes ?? null,
    is_active: row.is_active,
    created_by_user_id: row.created_by_user_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toPilotParticipantData(
  row: PilotParticipant,
): PilotParticipantData {
  return {
    id: row.id,
    pilot_configuration_id: row.pilot_configuration_id,
    user_id: row.user_id,
    participant_type: row.participant_type,
    status: row.status,
    consent_given_at: row.consent_given_at ?? null,
    consent_version: row.consent_version ?? null,
    approved_by_user_id: row.approved_by_user_id ?? null,
    approved_at: row.approved_at ?? null,
    notes: row.notes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toPilotFeedbackData(row: PilotFeedback): PilotFeedbackData {
  return {
    id: row.id,
    feedback_number: row.feedback_number,
    pilot_configuration_id: row.pilot_configuration_id ?? null,
    user_id: row.user_id,
    participant_type: row.participant_type ?? null,
    category: row.category,
    description: row.description,
    severity: row.severity,
    status: row.status,
    assigned_admin_user_id: row.assigned_admin_user_id ?? null,
    resolution_notes: row.resolution_notes ?? null,
    related_complaint_id: row.related_complaint_id ?? null,
    resolved_at: row.resolved_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
