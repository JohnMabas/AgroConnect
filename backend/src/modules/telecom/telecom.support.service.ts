import { Op, type WhereOptions } from "sequelize";
import { TelecomSupportRequest } from "../../database/models/index.js";
import type { TelecomSupportRequestStatus } from "../../database/models/telecom-support-request.model.js";
import { buildTelecomSupportRequestData } from "./telecom.admin.types.js";
import type { TelecomChannel } from "./telecom.types.js";

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

export async function createTelecomSupportRequest(params: {
  userId: string | null;
  phoneNumber: string;
  channel: TelecomChannel;
  language: string;
  message: string;
  providerSessionId?: string | null;
}): Promise<TelecomSupportRequest> {
  return TelecomSupportRequest.create({
    user_id: params.userId,
    phone_number: params.phoneNumber,
    channel: params.channel,
    language: params.language,
    message: params.message,
    status: "open",
    provider_session_id: params.providerSessionId ?? null,
  });
}

export async function listTelecomSupportRequests(filters: {
  page: number;
  limit: number;
  status?: TelecomSupportRequestStatus;
  channel?: TelecomChannel;
}): Promise<{
  support_requests: ReturnType<typeof buildTelecomSupportRequestData>[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}> {
  const where: WhereOptions = {};
  const mutable = where as Record<string, unknown>;
  if (filters.status) mutable.status = filters.status;
  if (filters.channel) mutable.channel = filters.channel;

  const { count, rows } = await TelecomSupportRequest.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit,
  });

  return {
    support_requests: rows.map(buildTelecomSupportRequestData),
    total: Number(count),
    page: filters.page,
    limit: filters.limit,
    total_pages: Math.ceil(Number(count) / filters.limit),
  };
}

export async function updateTelecomSupportRequestStatus(
  id: string,
  status: TelecomSupportRequestStatus,
): Promise<ReturnType<typeof buildTelecomSupportRequestData>> {
  const request = await TelecomSupportRequest.findByPk(id);
  if (!request) throw serviceError("Support request not found.", "NOT_FOUND");
  await request.update({ status });
  return buildTelecomSupportRequestData(request);
}

export async function countOpenSupportRequests(): Promise<number> {
  return TelecomSupportRequest.count({
    where: { status: { [Op.in]: ["open", "acknowledged"] } },
  });
}
