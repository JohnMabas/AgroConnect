export type CooperativeVerificationStatus = "pending" | "approved" | "rejected" | "suspended";
export type MembershipStatus = "pending" | "active" | "rejected" | "suspended" | "left";
export type MembershipRole = "member" | "coordinator";
export type AgentAssignmentStatus = "active" | "deactivated";

export interface CooperativeData {
  id: string;
  registered_by_user_id: string;
  cooperative_name: string;
  registration_number: string | null;
  description: string | null;
  country: string | null;
  state_or_region: string | null;
  local_government_area: string | null;
  community: string | null;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  logo_url: string | null;
  verification_status: CooperativeVerificationStatus;
  approval_notes: string | null;
  approved_by_user_id: string | null;
  approved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface MembershipData {
  id: string;
  cooperative_id: string;
  farmer_user_id: string;
  membership_number: string | null;
  membership_role: MembershipRole;
  status: MembershipStatus;
  joined_at: Date | null;
  approved_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AgentAssignmentData {
  id: string;
  cooperative_id: string;
  agent_user_id: string;
  assigned_by_user_id: string;
  status: AgentAssignmentStatus;
  assigned_at: Date;
  created_at: Date;
  updated_at: Date;
}
