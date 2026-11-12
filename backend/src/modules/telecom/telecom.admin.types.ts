import type {
  TelecomSupportRequest,
  TelecomSupportRequestStatus,
} from "../../database/models/telecom-support-request.model.js";
import type {
  TelecomWebhookEvent,
  TelecomWebhookEventStatus,
} from "../../database/models/telecom-webhook-event.model.js";
import type {
  UssdSession,
  UssdSessionStatus,
} from "../../database/models/ussd-session.model.js";
import type {
  VoiceCallSession,
  VoiceCallSessionStatus,
} from "../../database/models/voice-call-session.model.js";

export interface TelecomSupportRequestData {
  id: string;
  user_id: string | null;
  phone_number: string;
  channel: "ussd" | "voice";
  language: string;
  message: string;
  status: TelecomSupportRequestStatus;
  provider_session_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UssdSessionData {
  id: string;
  provider_session_id: string;
  phone_number: string;
  network_code: string | null;
  service_code: string | null;
  user_id: string | null;
  language: string;
  menu_key: string;
  status: UssdSessionStatus;
  expires_at: Date;
  started_at: Date;
  last_activity_at: Date;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface VoiceCallSessionData {
  id: string;
  provider_session_id: string;
  caller_number: string;
  destination_number: string | null;
  direction: string | null;
  user_id: string | null;
  language: string;
  menu_key: string;
  status: VoiceCallSessionStatus;
  expires_at: Date;
  started_at: Date;
  last_activity_at: Date;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TelecomWebhookEventData {
  id: string;
  provider: string;
  channel: "ussd" | "voice";
  event_key: string;
  provider_session_id: string | null;
  payload_hash: string;
  status: TelecomWebhookEventStatus;
  error_message: string | null;
  received_at: Date;
  processed_at: Date | null;
}

export function buildTelecomSupportRequestData(
  row: TelecomSupportRequest,
): TelecomSupportRequestData {
  return {
    id: row.id,
    user_id: row.user_id ?? null,
    phone_number: row.phone_number,
    channel: row.channel,
    language: row.language,
    message: row.message,
    status: row.status,
    provider_session_id: row.provider_session_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function buildUssdSessionData(row: UssdSession): UssdSessionData {
  return {
    id: row.id,
    provider_session_id: row.provider_session_id,
    phone_number: row.phone_number,
    network_code: row.network_code ?? null,
    service_code: row.service_code ?? null,
    user_id: row.user_id ?? null,
    language: row.language,
    menu_key: row.menu_key,
    status: row.status,
    expires_at: row.expires_at,
    started_at: row.started_at,
    last_activity_at: row.last_activity_at,
    ended_at: row.ended_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function buildVoiceCallSessionData(
  row: VoiceCallSession,
): VoiceCallSessionData {
  return {
    id: row.id,
    provider_session_id: row.provider_session_id,
    caller_number: row.caller_number,
    destination_number: row.destination_number ?? null,
    direction: row.direction ?? null,
    user_id: row.user_id ?? null,
    language: row.language,
    menu_key: row.menu_key,
    status: row.status,
    expires_at: row.expires_at,
    started_at: row.started_at,
    last_activity_at: row.last_activity_at,
    ended_at: row.ended_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function buildTelecomWebhookEventData(
  row: TelecomWebhookEvent,
): TelecomWebhookEventData {
  return {
    id: row.id,
    provider: row.provider,
    channel: row.channel,
    event_key: row.event_key,
    provider_session_id: row.provider_session_id ?? null,
    payload_hash: row.payload_hash,
    status: row.status,
    error_message: row.error_message ?? null,
    received_at: row.received_at,
    processed_at: row.processed_at ?? null,
  };
}
