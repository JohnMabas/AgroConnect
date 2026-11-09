import type { VerificationDocumentType } from "../../database/models/verification-document.model.js";
import type {
  VerificationStatus,
  VerificationType,
} from "../../database/models/verification.model.js";

export interface VerificationUserSummary {
  id: string;
  display_name: string | null;
  email: string | null;
  phone_number: string | null;
  status: string;
}

export interface VerificationDocumentData {
  id: string;
  verification_id: string;
  document_type: VerificationDocumentType;
  original_file_name: string;
  mime_type: string;
  file_size_bytes: number;
  checksum_sha256: string | null;
  created_at: Date;
}

export interface VerificationHistoryData {
  id: string;
  verification_id: string;
  actor_user_id: string | null;
  action: string;
  previous_status: string | null;
  new_status: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  actor?: { id: string; display_name: string | null };
  created_at: Date;
}

export interface VerificationData {
  id: string;
  user_id: string;
  verification_type: VerificationType;
  status: VerificationStatus;
  submitted_at: Date | null;
  reviewed_at: Date | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  expiry_date: Date | null;
  documents_count: number;
  user?: VerificationUserSummary;
  reviewed_by_user?: { id: string; display_name: string | null };
  documents?: VerificationDocumentData[];
  created_at: Date;
  updated_at: Date;
}

export interface VerificationDetail extends VerificationData {
  history: VerificationHistoryData[];
}

export interface VerificationIndicator {
  verification_type: VerificationType;
  label: string;
  status: VerificationStatus;
  verified_at: Date | null;
  rejected_reason: string | null;
}

export interface VerificationStatusOverview {
  user_id: string;
  phone_number_verified: boolean;
  email_verified: boolean;
  indicators: VerificationIndicator[];
  requests: VerificationData[];
}

export interface PaginatedVerifications {
  verifications: VerificationData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
