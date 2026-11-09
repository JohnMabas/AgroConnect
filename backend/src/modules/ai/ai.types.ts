import type { AIConversationCategory, AIConversationStatus } from "../../database/models/ai-conversation.model.js";
import type { AIKnowledgeReference } from "../../database/models/ai-conversation-message.model.js";
import type { AIUsageFeature, AIUsageStatus } from "../../database/models/ai-usage-log.model.js";
import type { IntegrityReviewAction } from "../../database/models/integrity-review-history.model.js";
import type {
  IntegrityDetectionMethod,
  IntegrityEvidence,
  IntegrityReason,
  IntegrityReviewStatus,
  IntegrityRiskCategory,
  IntegrityRiskLevel,
} from "../../database/models/integrity-assessment.model.js";
import type { KnowledgeApprovalStatus } from "../../database/models/agricultural-knowledge.model.js";
import type { ConversationListQuery, SendConversationMessageInput } from "./ai.validation.js";
import type {
  RecommendationStatus,
  RecommendationType,
} from "../../database/models/recommendation.model.js";

export interface AIConversationData {
  id: string;
  user_id: string;
  title: string;
  category: AIConversationCategory;
  status: AIConversationStatus;
  last_message_at: Date | null;
  message_count?: number;
  created_at: Date;
  updated_at: Date;
}

export interface AIConversationMessageData {
  id: string;
  conversation_id: string;
  sender: "user" | "assistant" | "system";
  content: string;
  safety_flags: string[];
  knowledge_references: AIKnowledgeReference[];
  provider: string | null;
  model: string | null;
  request_tokens: number;
  response_tokens: number;
  latency_ms: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface AIConversationDetail extends AIConversationData {
  messages: AIConversationMessageData[];
}

export interface PaginatedAIConversations {
  conversations: AIConversationData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface KnowledgeReferenceData {
  id: string;
  title: string;
  topic: string;
  crop: string | null;
  region: string | null;
  summary: string | null;
  source_name: string | null;
  source_url: string | null;
  publication_date: string | null;
  review_date: string | null;
  approval_status: KnowledgeApprovalStatus;
  safety_flags: string[];
  created_by_user_id: string;
  approved_by_user_id: string | null;
  approved_at: Date | null;
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PaginatedKnowledge {
  knowledge: KnowledgeReferenceData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface RecommendationData {
  id: string;
  user_id: string;
  recommendation_type: RecommendationType;
  title: string;
  summary: string;
  reason: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  score: number;
  status: RecommendationStatus;
  expires_at: Date | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface PaginatedRecommendations {
  recommendations: RecommendationData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface IntegrityAssessmentData {
  id: string;
  subject_user_id: string;
  subject_display_name?: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  risk_category: IntegrityRiskCategory;
  risk_score: number;
  risk_level: IntegrityRiskLevel;
  detection_method: IntegrityDetectionMethod;
  reasons: IntegrityReason[];
  evidence: IntegrityEvidence[];
  review_status: IntegrityReviewStatus;
  assigned_admin_user_id: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: Date | null;
  resolution_note: string | null;
  false_positive: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IntegrityReviewHistoryData {
  id: string;
  assessment_id: string;
  admin_user_id: string;
  admin_display_name: string | null;
  action: IntegrityReviewAction;
  from_status: string | null;
  to_status: string;
  notes: string | null;
  created_at: Date;
}

export interface IntegrityAssessmentDetail extends IntegrityAssessmentData {
  review_history: IntegrityReviewHistoryData[];
}

export interface PaginatedIntegrityAssessments {
  assessments: IntegrityAssessmentData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface IntegrityAssessmentResult {
  assessment: IntegrityAssessmentData | null;
  signals_detected: number;
  message: string;
}

export interface AIFeatureFlags {
  assistant_enabled: boolean;
  recommendations_enabled: boolean;
  integrity_enabled: boolean;
}

export interface AIConfigurationData extends AIFeatureFlags {
  provider: string;
  model: string | null;
  provider_configured: boolean;
  updated_by_user_id: string | null;
  updated_at: Date | null;
}

export interface AIUsageData {
  id: string;
  user_id: string;
  feature: AIUsageFeature;
  provider: string | null;
  model: string | null;
  status: AIUsageStatus;
  request_tokens: number;
  response_tokens: number;
  total_tokens: number;
  latency_ms: number | null;
  error_code: string | null;
  created_at: Date;
}

export interface AIUsageGroup {
  feature: string;
  status: string;
  request_count: number;
  total_tokens: number;
  average_latency_ms: number;
}

export interface PaginatedAIUsage {
  usage: AIUsageData[];
  summary: AIUsageGroup[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AIHealthData {
  provider: string;
  model: string | null;
  provider_configured: boolean;
  feature_flags: AIFeatureFlags;
  knowledge: {
    approved: number;
    pending: number;
    rejected: number;
    archived: number;
  };
  integrity: {
    pending_review: number;
    high_or_critical: number;
    resolved: number;
  };
  usage_last_24_hours: {
    requests: number;
    errors: number;
    fallbacks: number;
    blocked: number;
    total_tokens: number;
  };
  checked_at: Date;
}

export interface AssistantAnswerResult {
  conversation: AIConversationData;
  user_message: AIConversationMessageData;
  assistant_message: AIConversationMessageData;
  ai_generated: boolean;
  safety_flags: string[];
}

export type { ConversationListQuery, SendConversationMessageInput };
