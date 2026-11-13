import type {
  PilotConfigurationStatus,
  PilotReadinessOverride,
} from "../../database/models/pilot-configuration.model.js";
import type {
  PilotParticipantStatus,
  PilotParticipantType,
} from "../../database/models/pilot-participant.model.js";
import type {
  PilotFeedbackCategory,
  PilotFeedbackSeverity,
  PilotFeedbackStatus,
} from "../../database/models/pilot-feedback.model.js";
import type {
  IntegrationStatus,
  PilotReadinessStatus,
  ReadinessCategory,
  TestingStatus,
} from "./pilot.readiness.catalog.js";

export interface PilotConfigurationData {
  id: string;
  name: string;
  status: PilotConfigurationStatus;
  country: string;
  state_or_region: string;
  start_date: string | null;
  end_date: string | null;
  locations: string[];
  produce_category_ids: string[];
  readiness_overrides: Record<string, PilotReadinessOverride>;
  notes: string | null;
  is_active: boolean;
  created_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PilotParticipantData {
  id: string;
  pilot_configuration_id: string;
  user_id: string;
  participant_type: PilotParticipantType;
  status: PilotParticipantStatus;
  consent_given_at: Date | null;
  consent_version: string | null;
  approved_by_user_id: string | null;
  approved_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PilotFeedbackData {
  id: string;
  feedback_number: string;
  pilot_configuration_id: string | null;
  user_id: string;
  participant_type: PilotParticipantType | null;
  category: PilotFeedbackCategory;
  description: string;
  severity: PilotFeedbackSeverity;
  status: PilotFeedbackStatus;
  assigned_admin_user_id: string | null;
  resolution_notes: string | null;
  related_complaint_id: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ReadinessModuleData {
  key: string;
  name: string;
  category: ReadinessCategory;
  critical: boolean;
  implementation_status: string;
  testing_status: TestingStatus;
  integration_status: IntegrationStatus;
  pilot_readiness: PilotReadinessStatus;
  evidence: string[];
  known_issues: string[];
  dependencies: string[];
  runtime_notes: string[];
  override: PilotReadinessOverride | null;
  source: "catalog" | "admin_review";
}

export interface PilotReadinessSummary {
  total_modules: number;
  critical_modules: number;
  counts_by_readiness: Record<string, number>;
  counts_by_testing: Record<string, number>;
  counts_by_integration: Record<string, number>;
  critical_blockers: string[];
  modules_awaiting_provider_approval: string[];
}

export type LaunchRecommendation =
  | "NOT_READY"
  | "INTERNAL_TESTING_READY"
  | "CONTROLLED_PILOT_READY";

export interface PilotReadinessReport {
  generated_at: Date;
  pilot_configuration: PilotConfigurationData | null;
  launch_recommendation: LaunchRecommendation;
  recommendation_reason: string;
  summary: PilotReadinessSummary;
  modules: ReadinessModuleData[];
}

export interface PilotMetricsWindow {
  start: Date | null;
  end: Date | null;
  timezone: string;
}

export interface PilotMetrics {
  pilot_configuration_id: string;
  generated_at: Date;
  window: PilotMetricsWindow;
  farmers: {
    registered: number;
    verified: number;
    active: number;
    received_enquiries: number;
    completed_transactions: number;
    via_ussd: number;
    via_voice: number;
  };
  buyers: {
    registered: number;
    active: number;
    requests_created: number;
    offers_made: number;
    offers_accepted: number;
    completed_transactions: number;
  };
  marketplace: {
    active_listings: number;
    available_quantity: number;
    total_offers: number;
    accepted_offers: number;
    completed_orders: number;
    paid_transaction_value: number;
    average_order_value: number;
    order_completion_rate: number;
    payment_success_rate: number;
    reservation_expiry_rate: number;
  };
  accessibility: {
    ussd_sessions_started: number;
    ussd_sessions_completed: number;
    ussd_listing_flow_started: number;
    ussd_listing_flow_completed: number;
    ussd_listing_completion_rate: number;
    voice_calls_completed: number;
    registration_completion_rate: number;
    support_requests: number;
    pilot_feedback_received: number;
  };
  trust: {
    active_cooperative_agents: number;
    active_agent_relationships: number;
    consent_revocations: number;
    complaints_submitted: number;
    complaints_resolved: number;
    feedback_critical_open: number;
  };
  participation: {
    invited: number;
    approved: number;
    active: number;
    suspended: number;
    removed: number;
  };
}

export interface Paginated<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
