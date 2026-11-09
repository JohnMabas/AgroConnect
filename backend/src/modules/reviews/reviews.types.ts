import type {
  ReviewReportReason,
  ReviewReportStatus,
} from "../../database/models/review-report.model.js";

export interface ReviewUserSummary {
  id: string;
  display_name: string | null;
}

export interface ReviewOrderSummary {
  id: string;
  order_number: string;
  status: string;
}

export interface ReviewDeliverySummary {
  id: string;
  delivery_reference: string;
  status: string;
  transporter_id: string | null;
}

export interface ReviewData {
  id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  order_id: string;
  delivery_id: string | null;
  rating: number;
  review_title: string | null;
  review_comment: string | null;
  is_hidden: boolean;
  hidden_reason: string | null;
  hidden_by_user_id: string | null;
  hidden_at: Date | null;
  edited_at: Date | null;
  reviewer?: ReviewUserSummary;
  reviewed_user?: ReviewUserSummary;
  order?: ReviewOrderSummary;
  delivery?: ReviewDeliverySummary | null;
  created_at: Date;
  updated_at: Date;
}

export interface ReviewSummary {
  user_id: string;
  total_reviews: number;
  average_rating: number;
  rating_distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  five_star_reviews: number;
  reviews_with_comments: number;
}

export interface PaginatedReviews {
  reviews: ReviewData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ReviewReportData {
  id: string;
  review_id: string;
  reporter_id: string;
  reason: ReviewReportReason;
  description: string | null;
  status: ReviewReportStatus;
  reviewed_by: string | null;
  resolution_note: string | null;
  reporter?: ReviewUserSummary;
  reviewed_by_user?: ReviewUserSummary;
  review?: ReviewData;
  created_at: Date;
  updated_at: Date;
}

export interface PaginatedReviewReports {
  reports: ReviewReportData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ReviewHistoryData {
  id: string;
  review_id: string;
  report_id: string | null;
  actor_user_id: string | null;
  action: string;
  previous_rating: number | null;
  new_rating: number | null;
  previous_title: string | null;
  new_title: string | null;
  previous_comment: string | null;
  new_comment: string | null;
  note: string | null;
  metadata: Record<string, unknown> | null;
  actor?: ReviewUserSummary;
  created_at: Date;
}

export interface AdminReviewDetail {
  review: ReviewData;
  history: ReviewHistoryData[];
  reports: ReviewReportData[];
}

export interface VerificationIndicator {
  verification_type: string;
  label: string;
  status:
    | "not_submitted"
    | "pending"
    | "approved"
    | "rejected"
    | "expired";
  verified_at: Date | null;
  rejected_reason: string | null;
}

export interface UserTrustProfile {
  user: ReviewUserSummary & {
    member_since: Date;
    account_status: string;
  };
  ratings: ReviewSummary;
  verification_indicators: VerificationIndicator[];
  completed_orders: number;
  completed_deliveries_as_transporter: number;
  has_verified_contact: boolean;
  has_approved_identity: boolean;
}
