import type {
  TransporterApprovalStatus,
  TransporterAvailabilityStatus,
} from "../../database/models/transporter-profile.model.js";

export interface TransporterUserSummary {
  id: string;
  display_name: string | null;
}

export interface TransporterProfileData {
  id: string;
  user_id: string;
  business_name: string;
  contact_phone: string;
  operating_location: string;
  coverage_areas: string[];
  vehicle_type: string | null;
  vehicle_registration_number: string | null;
  vehicle_capacity: string | null;
  produce_types: string[];
  availability_status: TransporterAvailabilityStatus;
  approval_status: TransporterApprovalStatus;
  approved_by_user_id: string | null;
  approved_at: Date | null;
  suspended_reason: string | null;
  user?: TransporterUserSummary;
  created_at: Date;
  updated_at: Date;
}

export interface PaginatedTransporters {
  transporters: TransporterProfileData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
