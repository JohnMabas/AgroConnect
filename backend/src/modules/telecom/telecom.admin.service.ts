import { Op, type WhereOptions } from "sequelize";
import { env } from "../../config/env.js";
import {
  TelecomWebhookEvent,
  UssdSession,
  VoiceCallSession,
} from "../../database/models/index.js";
import type { TelecomWebhookEventStatus } from "../../database/models/telecom-webhook-event.model.js";
import { languageDefinitions } from "../localization/localization.messages.js";
import {
  buildTelecomWebhookEventData,
  buildUssdSessionData,
  buildVoiceCallSessionData,
  type TelecomWebhookEventData,
  type UssdSessionData,
  type VoiceCallSessionData,
} from "./telecom.admin.types.js";

type TelecomSessionData =
  | (UssdSessionData & { channel: "ussd" })
  | (VoiceCallSessionData & { channel: "voice" });

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

export async function listTelecomSessions(filters: {
  page: number;
  limit: number;
  status?: "active" | "completed" | "expired" | "failed";
  channel?: "ussd" | "voice";
  phone_number?: string;
}): Promise<{
  sessions: TelecomSessionData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}> {
  const ussdWhere: WhereOptions = {};
  const voiceWhere: WhereOptions = {};
  const ussdMutable = ussdWhere as Record<string, unknown>;
  const voiceMutable = voiceWhere as Record<string, unknown>;
  if (filters.status) {
    ussdMutable.status = filters.status;
    voiceMutable.status = filters.status;
  }
  if (filters.phone_number) {
    ussdMutable.phone_number = filters.phone_number;
    voiceMutable.caller_number = filters.phone_number;
  }

  const includeUssd = filters.channel !== "voice";
  const includeVoice = filters.channel !== "ussd";

  const [ussdRows, voiceRows] = await Promise.all([
    includeUssd
      ? UssdSession.findAll({
          where: ussdWhere,
          order: [["last_activity_at", "DESC"]],
          limit: filters.page * filters.limit,
        })
      : Promise.resolve([]),
    includeVoice
      ? VoiceCallSession.findAll({
          where: voiceWhere,
          order: [["last_activity_at", "DESC"]],
          limit: filters.page * filters.limit,
        })
      : Promise.resolve([]),
  ]);

  const merged: TelecomSessionData[] = [
    ...ussdRows.map((row) => ({
      ...buildUssdSessionData(row),
      channel: "ussd" as const,
    })),
    ...voiceRows.map((row) => ({
      ...buildVoiceCallSessionData(row),
      channel: "voice" as const,
    })),
  ].sort(
    (a, b) => b.last_activity_at.getTime() - a.last_activity_at.getTime(),
  );

  const [ussdTotal, voiceTotal] = await Promise.all([
    includeUssd ? UssdSession.count({ where: ussdWhere }) : 0,
    includeVoice ? VoiceCallSession.count({ where: voiceWhere }) : 0,
  ]);
  const total = ussdTotal + voiceTotal;
  const offset = (filters.page - 1) * filters.limit;

  return {
    sessions: merged.slice(offset, offset + filters.limit),
    total,
    page: filters.page,
    limit: filters.limit,
    total_pages: Math.ceil(total / filters.limit),
  };
}

export async function listTelecomWebhookEvents(filters: {
  page: number;
  limit: number;
  channel?: "ussd" | "voice";
  status?: TelecomWebhookEventStatus;
}): Promise<{
  webhook_events: TelecomWebhookEventData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}> {
  const where: WhereOptions = {};
  const mutable = where as Record<string, unknown>;
  if (filters.channel) mutable.channel = filters.channel;
  if (filters.status) mutable.status = filters.status;

  const { count, rows } = await TelecomWebhookEvent.findAndCountAll({
    where,
    order: [["received_at", "DESC"]],
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit,
  });

  return {
    webhook_events: rows.map(buildTelecomWebhookEventData),
    total: Number(count),
    page: filters.page,
    limit: filters.limit,
    total_pages: Math.ceil(Number(count) / filters.limit),
  };
}

export async function terminateTelecomSession(
  channel: "ussd" | "voice",
  id: string,
): Promise<TelecomSessionData> {
  if (channel === "ussd") {
    const session = await UssdSession.findByPk(id);
    if (!session) throw serviceError("USSD session not found.", "NOT_FOUND");
    if (session.status === "active") {
      await session.update({
        status: "completed",
        ended_at: new Date(),
        last_activity_at: new Date(),
      });
    }
    return { ...buildUssdSessionData(session), channel: "ussd" };
  }

  const session = await VoiceCallSession.findByPk(id);
  if (!session) throw serviceError("Voice session not found.", "NOT_FOUND");
  if (session.status === "active") {
    await session.update({
      status: "completed",
      ended_at: new Date(),
      last_activity_at: new Date(),
    });
  }
  return { ...buildVoiceCallSessionData(session), channel: "voice" };
}

export async function getTelecomConfigStatus(): Promise<{
  enabled: boolean;
  provider: "africastalking";
  environment: string;
  ussd_enabled: boolean;
  voice_enabled: boolean;
  ussd_service_code_configured: boolean;
  voice_number_configured: boolean;
  voice_callback_url_configured: boolean;
  ussd_secret_configured: boolean;
  voice_secret_configured: boolean;
  shared_secret_configured: boolean;
  ip_allowlist_configured: boolean;
  session_ttl_seconds: number;
  duplicate_window_seconds: number;
  rate_limit_per_minute: number;
  supported_languages: Array<{
    code: string;
    name: string;
    reviewed: boolean;
  }>;
  webhook_events_received: number;
  active_ussd_sessions: number;
  active_voice_sessions: number;
}> {
  const [webhookEvents, activeUssd, activeVoice] = await Promise.all([
    TelecomWebhookEvent.count(),
    UssdSession.count({ where: { status: "active" } }),
    VoiceCallSession.count({ where: { status: "active" } }),
  ]);

  return {
    enabled: env.TELECOM_ENABLED,
    provider: "africastalking",
    environment: env.AFRICASTALKING_ENVIRONMENT,
    ussd_enabled: env.USSD_ENABLED,
    voice_enabled: env.VOICE_ENABLED,
    ussd_service_code_configured: Boolean(env.USSD_SERVICE_CODE),
    voice_number_configured: Boolean(env.VOICE_NUMBER),
    voice_callback_url_configured: Boolean(env.VOICE_CALLBACK_URL),
    ussd_secret_configured: Boolean(env.USSD_CALLBACK_SECRET),
    voice_secret_configured: Boolean(env.VOICE_CALLBACK_SECRET),
    shared_secret_configured: Boolean(env.TELECOM_CALLBACK_SECRET),
    ip_allowlist_configured: Boolean(env.TELECOM_CALLBACK_IP_ALLOWLIST),
    session_ttl_seconds: env.TELECOM_SESSION_TTL_SECONDS,
    duplicate_window_seconds: env.TELECOM_DUPLICATE_WINDOW_SECONDS,
    rate_limit_per_minute: env.TELECOM_RATE_LIMIT_PER_MINUTE,
    supported_languages: languageDefinitions().map((item) => ({
      code: item.code,
      name: item.name,
      reviewed: item.reviewed,
    })),
    webhook_events_received: webhookEvents,
    active_ussd_sessions: activeUssd,
    active_voice_sessions: activeVoice,
  };
}

export async function countTelecomWebhookEvents(
  status?: TelecomWebhookEventStatus,
): Promise<number> {
  return TelecomWebhookEvent.count({
    where: status ? { status: { [Op.eq]: status } } : undefined,
  });
}
