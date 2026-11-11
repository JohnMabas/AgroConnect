import type {
  AgentProfileStatus,
  AgentVerificationStatus,
} from "../../database/models/agent-profile.model.js";
import type {
  FarmerAgentRelationshipStatus,
  FarmerConsentMethod,
} from "../../database/models/farmer-agent-relationship.model.js";
import type {
  FarmerActionApprovalStatus,
  FarmerApprovalMethod,
} from "../../database/models/farmer-action-approval.model.js";
import type {
  FarmerComplaintCategory,
  FarmerComplaintPriority,
  FarmerComplaintStatus,
} from "../../database/models/farmer-complaint.model.js";
import type { OrderFeeType } from "../../database/models/order-fee-disclosure.model.js";

export interface AgentProfileData {
  id: string;
  user_id: string;
  cooperative_id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  identity_verification_reference: string | null;
  operating_area: string | null;
  appointment_date: string | null;
  status: AgentProfileStatus;
  verification_status: AgentVerificationStatus;
  code_of_conduct_version: string | null;
  code_of_conduct_accepted_at: Date | null;
  invited_by_user_id: string;
  verified_by_user_id: string | null;
  verified_at: Date | null;
  suspended_at: Date | null;
  removed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AgentVerificationData {
  id: string;
  agent_profile_id: string;
  submitted_by_user_id: string;
  status: AgentVerificationStatus;
  identity_reference: string | null;
  documents: unknown[];
  notes: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: Date | null;
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface FarmerAgentPermissionData {
  id: string;
  relationship_id: string;
  permission_key: string;
  is_granted: boolean;
  granted_at: Date | null;
  revoked_at: Date | null;
  granted_by_user_id: string | null;
}

export interface FarmerAgentRelationshipData {
  id: string;
  farmer_user_id: string;
  agent_user_id: string;
  cooperative_id: string;
  agent_profile_id: string | null;
  status: FarmerAgentRelationshipStatus;
  consent_method: FarmerConsentMethod;
  requested_by_user_id: string;
  consent_given_at: Date | null;
  consent_expires_at: Date | null;
  consent_revoked_at: Date | null;
  revoked_by_user_id: string | null;
  rejection_reason: string | null;
  permissions: FarmerAgentPermissionData[];
  created_at: Date;
  updated_at: Date;
}

export interface FarmerConsentRecordData {
  id: string;
  relationship_id: string;
  farmer_user_id: string;
  agent_user_id: string;
  cooperative_id: string;
  action: string;
  method: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface FarmerActionApprovalData {
  id: string;
  farmer_user_id: string;
  agent_user_id: string;
  cooperative_id: string;
  relationship_id: string | null;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  previous_values: Record<string, unknown> | null;
  proposed_values: Record<string, unknown>;
  proposed_values_hash: string;
  approval_status: FarmerActionApprovalStatus;
  approval_method: FarmerApprovalMethod;
  evidence_reference: string | null;
  expires_at: Date;
  approved_at: Date | null;
  rejected_at: Date | null;
  cancelled_at: Date | null;
  applied_at: Date | null;
  application_result: Record<string, unknown> | null;
  failure_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ComplaintEvidenceData {
  id: string;
  complaint_id: string;
  uploaded_by_user_id: string;
  original_file_name: string;
  file_type: string;
  file_size_bytes: number;
  description: string | null;
  checksum_sha256: string | null;
  created_at: Date;
}

export interface ComplaintInvestigationData {
  id: string;
  complaint_id: string;
  admin_user_id: string;
  action: string;
  notes: string | null;
  decision: string | null;
  created_at: Date;
}

export interface FarmerComplaintData {
  id: string;
  complaint_number: string;
  farmer_user_id: string;
  agent_user_id: string | null;
  cooperative_id: string | null;
  related_order_id: string | null;
  related_listing_id: string | null;
  category: FarmerComplaintCategory;
  description: string;
  status: FarmerComplaintStatus;
  priority: FarmerComplaintPriority;
  assigned_admin_user_id: string | null;
  resolution: string | null;
  resolved_at: Date | null;
  evidence_count?: number;
  evidence?: ComplaintEvidenceData[];
  investigations?: ComplaintInvestigationData[];
  created_at: Date;
  updated_at: Date;
}

export interface OrderFeeDisclosureData {
  id: string;
  order_id: string;
  cooperative_id: string | null;
  agent_user_id: string | null;
  fee_type: OrderFeeType;
  amount_minor: string;
  currency: string;
  description: string | null;
  disclosed_at: Date;
  agreed_by_farmer_user_id: string | null;
  agreed_at: Date | null;
  farmer_approval_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLogData {
  id: string;
  agent_user_id: string | null;
  farmer_user_id: string | null;
  cooperative_id: string | null;
  action: string;
  description: string | null;
  resource_type: string | null;
  resource_id: string | null;
  approval_required: boolean;
  approval_id: string | null;
  approval_status: string | null;
  action_result: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
