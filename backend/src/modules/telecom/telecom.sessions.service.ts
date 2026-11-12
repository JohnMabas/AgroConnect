import { createHash } from "node:crypto";
import { UniqueConstraintError } from "sequelize";
import { env } from "../../config/env.js";
import {
  TelecomWebhookEvent,
  UssdSession,
  UssdSessionEvent,
  VoiceCallEvent,
  VoiceCallSession,
} from "../../database/models/index.js";
import type { TelecomWebhookEventStatus } from "../../database/models/telecom-webhook-event.model.js";

export function hashTelecomInput(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashTelecomPayload(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function sessionExpiry(): Date {
  return new Date(Date.now() + env.TELECOM_SESSION_TTL_SECONDS * 1000);
}

function dedupeBucket(): number {
  return Math.floor(
    Date.now() / (env.TELECOM_DUPLICATE_WINDOW_SECONDS * 1000),
  );
}

export async function findUssdSession(
  providerSessionId: string,
): Promise<UssdSession | null> {
  return UssdSession.findOne({ where: { provider_session_id: providerSessionId } });
}

export async function createUssdSession(params: {
  providerSessionId: string;
  phoneNumber: string;
  networkCode?: string | null;
  serviceCode?: string | null;
  userId: string | null;
  language: string;
}): Promise<UssdSession> {
  const now = new Date();
  return UssdSession.create({
    provider_session_id: params.providerSessionId,
    phone_number: params.phoneNumber,
    network_code: params.networkCode ?? null,
    service_code: params.serviceCode ?? null,
    user_id: params.userId,
    language: params.language,
    menu_key: "main",
    status: "active",
    context: {},
    expires_at: sessionExpiry(),
    started_at: now,
    last_activity_at: now,
  });
}

export async function findVoiceCallSession(
  providerSessionId: string,
): Promise<VoiceCallSession | null> {
  return VoiceCallSession.findOne({
    where: { provider_session_id: providerSessionId },
  });
}

export async function createVoiceCallSession(params: {
  providerSessionId: string;
  callerNumber: string;
  destinationNumber?: string | null;
  direction?: string | null;
  userId: string | null;
  language: string;
}): Promise<VoiceCallSession> {
  const now = new Date();
  return VoiceCallSession.create({
    provider_session_id: params.providerSessionId,
    caller_number: params.callerNumber,
    destination_number: params.destinationNumber ?? null,
    direction: params.direction ?? null,
    user_id: params.userId,
    language: params.language,
    menu_key: "main",
    status: "active",
    context: {},
    expires_at: sessionExpiry(),
    started_at: now,
    last_activity_at: now,
  });
}

export async function expireUssdSessionIfNeeded(
  session: UssdSession,
): Promise<boolean> {
  if (session.status !== "active") return session.status === "expired";
  if (session.expires_at.getTime() > Date.now()) return false;
  await session.update({
    status: "expired",
    ended_at: new Date(),
    last_activity_at: new Date(),
  });
  return true;
}

export async function expireVoiceSessionIfNeeded(
  session: VoiceCallSession,
): Promise<boolean> {
  if (session.status !== "active") return session.status === "expired";
  if (session.expires_at.getTime() > Date.now()) return false;
  await session.update({
    status: "expired",
    ended_at: new Date(),
    last_activity_at: new Date(),
  });
  return true;
}

export async function saveUssdTurn(params: {
  session: UssdSession;
  eventKey: string;
  input: string;
  menuKey: string;
  context: Record<string, unknown>;
  language?: string;
  responseType: "CON" | "END";
  responseText: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const now = new Date();
  await params.session.update({
    menu_key: params.menuKey,
    context: params.context,
    language: params.language ?? params.session.language,
    last_input_hash: hashTelecomInput(params.input),
    last_input_at: now,
    last_response_type: params.responseType,
    last_response_text: params.responseText,
    last_activity_at: now,
    expires_at: sessionExpiry(),
    status: params.responseType === "END" ? "completed" : "active",
    ended_at: params.responseType === "END" ? now : null,
  });

  await UssdSessionEvent.create({
    ussd_session_id: params.session.id,
    event_key: params.eventKey,
    menu_key: params.menuKey,
    input_hash: hashTelecomInput(params.input),
    response_type: params.responseType,
    response_text: params.responseText,
    metadata: params.metadata ?? null,
  });
}

export async function saveVoiceTurn(params: {
  session: VoiceCallSession;
  eventKey: string;
  digits: string;
  menuKey: string;
  context: Record<string, unknown>;
  action: "say" | "get_digits" | "redirect" | "hangup";
  responseXml: string;
  end: boolean;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const now = new Date();
  await params.session.update({
    menu_key: params.menuKey,
    context: params.context,
    last_input_hash: hashTelecomInput(params.digits),
    last_input_at: now,
    last_response_xml: params.responseXml,
    last_activity_at: now,
    expires_at: sessionExpiry(),
    status: params.end ? "completed" : "active",
    ended_at: params.end ? now : null,
  });

  await VoiceCallEvent.create({
    voice_call_session_id: params.session.id,
    event_key: params.eventKey,
    action: params.action,
    input_digits_hash: hashTelecomInput(params.digits),
    response_xml: params.responseXml,
    metadata: params.metadata ?? null,
  });
}

export function ussdEventKey(sessionId: string, text: string): string {
  // USSD `text` is cumulative for the whole provider session, so the same
  // exact text can never legitimately occur twice within one session. Hashing
  // it without a time bucket gives durable idempotency across provider retries.
  return `ussd:${sessionId}:${hashTelecomInput(text)}`;
}

export function voiceEventKey(
  sessionId: string,
  menuKey: string,
  digits: string,
  isActive: boolean,
): string {
  return `voice:${sessionId}:${menuKey}:${isActive ? "1" : "0"}:${dedupeBucket()}:${hashTelecomInput(digits)}`;
}

export function voiceCallbackEventKey(
  sessionId: string,
  digits: string,
  isActive: boolean,
): string {
  // Voice `dtmfDigits` contains only the current keypress. The short time
  // bucket absorbs immediate provider retries, which carry an identical
  // payload and are indistinguishable from a rapid repeated keypress.
  return `voice:${sessionId}:${isActive ? "1" : "0"}:${dedupeBucket()}:${hashTelecomInput(digits)}`;
}

export async function findUssdSessionEvent(
  eventKey: string,
): Promise<UssdSessionEvent | null> {
  return UssdSessionEvent.findOne({ where: { event_key: eventKey } });
}

export async function findVoiceCallEvent(
  eventKey: string,
): Promise<VoiceCallEvent | null> {
  return VoiceCallEvent.findOne({ where: { event_key: eventKey } });
}

export async function recordWebhookEvent(params: {
  channel: "ussd" | "voice";
  eventKey: string;
  providerSessionId?: string | null;
  payload: unknown;
  metadata?: Record<string, unknown>;
}): Promise<{ event: TelecomWebhookEvent; duplicate: boolean }> {
  try {
    const event = await TelecomWebhookEvent.create({
      channel: params.channel,
      event_key: params.eventKey,
      provider_session_id: params.providerSessionId ?? null,
      payload_hash: hashTelecomPayload(params.payload),
      status: "received",
      metadata: params.metadata ?? null,
    });
    return { event, duplicate: false };
  } catch (err) {
    if (!(err instanceof UniqueConstraintError)) throw err;
    const existing = await TelecomWebhookEvent.findOne({
      where: { event_key: params.eventKey },
    });
    if (!existing) throw err;
    return { event: existing, duplicate: true };
  }
}

export async function markWebhookEvent(
  event: TelecomWebhookEvent,
  status: TelecomWebhookEventStatus,
  errorMessage?: string,
): Promise<void> {
  await event.update({
    status,
    error_message: errorMessage ?? null,
    processed_at: status === "processed" || status === "duplicate"
      ? new Date()
      : event.processed_at,
  });
}
