export type CallType = "audio" | "video";
export type CallStatus =
  | "ringing"
  | "accepted"
  | "rejected"
  | "ended"
  | "missed"
  | "cancelled"
  | "failed";

export interface CallParticipantSummary {
  id: string;
  display_name: string | null;
}

export interface CallData {
  id: string;
  conversation_id: string;
  caller_user_id: string;
  callee_user_id: string;
  call_type: CallType;
  status: CallStatus;
  initiated_at: Date;
  accepted_at: Date | null;
  ended_at: Date | null;
  ended_by_user_id: string | null;
  end_reason: string | null;
  duration_seconds: number | null;
  created_at: Date;
  updated_at: Date;
  caller?: CallParticipantSummary;
  callee?: CallParticipantSummary;
}

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface CallConfigData {
  iceServers: IceServerConfig[];
  turnConfigured: boolean;
}

export interface PaginatedCalls {
  calls: CallData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
