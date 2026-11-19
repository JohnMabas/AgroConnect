import { Op, type Transaction } from "sequelize";
import { env } from "../../config/env.js";
import {
  CallSession,
  Conversation,
  ConversationParticipant,
  User,
  sequelize,
} from "../../database/models/index.js";
import { emitToUser } from "../../realtime/registry.js";
import { dispatchNotification } from "../notifications/notifications.service.js";
import { buildCallIceConfig } from "./calls.ice-config.js";
import type {
  CallConfigData,
  CallData,
  CallStatus,
  CallType,
  PaginatedCalls,
} from "./calls.types.js";
import type { CreateCallInput, ListCallsQuery } from "./calls.validation.js";

type CallRow = CallSession & { caller?: User; callee?: User };

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

function participantSummary(user?: User) {
  return user ? { id: user.id, display_name: user.display_name ?? null } : undefined;
}

export function buildCallData(row: CallRow): CallData {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    caller_user_id: row.caller_user_id,
    callee_user_id: row.callee_user_id,
    call_type: row.call_type as CallType,
    status: row.status as CallStatus,
    initiated_at: row.initiated_at,
    accepted_at: row.accepted_at ?? null,
    ended_at: row.ended_at ?? null,
    ended_by_user_id: row.ended_by_user_id ?? null,
    end_reason: row.end_reason ?? null,
    duration_seconds:
      row.duration_seconds === null || row.duration_seconds === undefined
        ? null
        : Number(row.duration_seconds),
    created_at: row.created_at!,
    updated_at: row.updated_at!,
    caller: participantSummary(row.caller),
    callee: participantSummary(row.callee),
  };
}

async function loadCall(id: string, transaction?: Transaction): Promise<CallRow> {
  const row = (await CallSession.findByPk(id, {
    include: [
      { model: User, as: "caller", attributes: ["id", "display_name"] },
      { model: User, as: "callee", attributes: ["id", "display_name"] },
    ],
    transaction,
  })) as CallRow | null;
  if (!row) throw serviceError("Call not found.", "NOT_FOUND");
  return row;
}

export function getCallConfigForUser(_userId: string): CallConfigData {
  return buildCallIceConfig({
    stunUrls: env.STUN_URLS,
    turnUrls: env.TURN_URLS,
    turnUsername: env.TURN_USERNAME,
    turnCredential: env.TURN_CREDENTIAL,
  });
}

async function assertCallAccess(
  userId: string,
  conversationId: string,
  calleeUserId: string,
  transaction?: Transaction,
): Promise<void> {
  if (userId === calleeUserId) {
    throw serviceError("You cannot call yourself.", "INVALID_OPERATION");
  }

  const conversation = await Conversation.findByPk(conversationId, { transaction });
  if (!conversation) throw serviceError("Conversation not found.", "NOT_FOUND");
  if (conversation.status !== "active") {
    throw serviceError("Calls are only allowed in active conversations.", "INVALID_OPERATION");
  }

  const participants = await ConversationParticipant.findAll({
    where: { conversation_id: conversationId },
    attributes: ["user_id"],
    transaction,
  });
  const ids = new Set(participants.map((p) => p.user_id));
  if (!ids.has(userId) || !ids.has(calleeUserId)) {
    throw serviceError("Call participants must belong to the conversation.", "FORBIDDEN");
  }
}

function assertParticipant(row: CallSession, userId: string): void {
  if (row.caller_user_id !== userId && row.callee_user_id !== userId) {
    throw serviceError("Call not found.", "NOT_FOUND");
  }
}

export async function createCall(
  callerUserId: string,
  input: CreateCallInput,
): Promise<CallData> {
  const initiatedAt = new Date();
  const callId = await sequelize.transaction(async (transaction) => {
    await assertCallAccess(
      callerUserId,
      input.conversation_id,
      input.callee_user_id,
      transaction,
    );

    const existing = await CallSession.findOne({
      where: {
        conversation_id: input.conversation_id,
        status: { [Op.in]: ["ringing", "accepted"] },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existing) {
      throw serviceError("A call is already in progress for this conversation.", "INVALID_OPERATION");
    }

    const call = await CallSession.create(
      {
        conversation_id: input.conversation_id,
        caller_user_id: callerUserId,
        callee_user_id: input.callee_user_id,
        call_type: input.call_type,
        status: "ringing",
        initiated_at: initiatedAt,
      },
      { transaction },
    );
    return call.id;
  });

  return buildCallData(await loadCall(callId));
}

export async function listCalls(
  userId: string,
  query: ListCallsQuery,
): Promise<PaginatedCalls> {
  const andConditions: Record<string | symbol, unknown>[] = [
    { [Op.or]: [{ caller_user_id: userId }, { callee_user_id: userId }] },
  ];
  if (query.status) andConditions.push({ status: query.status });
  if (query.conversation_id) {
    andConditions.push({ conversation_id: query.conversation_id });
  }
  const where = { [Op.and]: andConditions };

  const { rows, count } = await CallSession.findAndCountAll({
    where,
    include: [
      { model: User, as: "caller", attributes: ["id", "display_name"] },
      { model: User, as: "callee", attributes: ["id", "display_name"] },
    ],
    order: [["initiated_at", "DESC"]],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
    distinct: true,
  });

  return {
    calls: (rows as CallRow[]).map(buildCallData),
    total: count,
    page: query.page,
    limit: query.limit,
    total_pages: Math.ceil(count / query.limit),
  };
}

export async function getCallById(userId: string, id: string): Promise<CallData> {
  const row = await loadCall(id);
  assertParticipant(row, userId);
  return buildCallData(row);
}

async function dispatchMissedCall(
  call: CallRow,
  recipientUserId: string,
  actorName: string | null,
): Promise<void> {
  await dispatchNotification({
    user_id: recipientUserId,
    notification_type: "call_missed",
    variables: {
      actor_name: actorName,
      action_type: call.call_type,
    },
    related_entity_type: "call",
    related_entity_id: call.id,
    action_url: `/conversations/${call.conversation_id}`,
    dedupe_key: `call:missed:${call.id}:${recipientUserId}`,
    allow_external: false,
  });
}

function otherParticipantId(call: CallSession, userId: string): string {
  return call.caller_user_id === userId ? call.callee_user_id : call.caller_user_id;
}

export async function acceptCall(
  userId: string,
  callId: string,
): Promise<{ call: CallData; changed: boolean }> {
  const result = await sequelize.transaction(async (transaction) => {
    const row = await CallSession.findByPk(callId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!row) throw serviceError("Call not found.", "NOT_FOUND");
    if (row.callee_user_id !== userId) {
      throw serviceError("Only the callee can accept this call.", "FORBIDDEN");
    }
    if (row.status === "accepted") return { changed: false, id: row.id };
    if (row.status !== "ringing") {
      throw serviceError("Call cannot be accepted in its current state.", "INVALID_OPERATION");
    }

    await row.update({ status: "accepted", accepted_at: new Date() }, { transaction });
    return { changed: true, id: row.id };
  });

  return { call: buildCallData(await loadCall(result.id)), changed: result.changed };
}

export async function rejectCall(
  userId: string,
  callId: string,
  reason?: string | null,
): Promise<{ call: CallData; changed: boolean; missedRecipientId?: string }> {
  const outcome = await sequelize.transaction(async (transaction) => {
    const row = await CallSession.findByPk(callId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!row) throw serviceError("Call not found.", "NOT_FOUND");
    if (row.callee_user_id !== userId) {
      throw serviceError("Only the callee can reject this call.", "FORBIDDEN");
    }
    if (row.status === "rejected") return { changed: false, id: row.id, missed: false };
    if (row.status !== "ringing") {
      throw serviceError("Call cannot be rejected in its current state.", "INVALID_OPERATION");
    }

    await row.update(
      {
        status: "rejected",
        ended_at: new Date(),
        ended_by_user_id: userId,
        end_reason: reason ?? "rejected",
      },
      { transaction },
    );
    return { changed: true, id: row.id, missed: true, callerId: row.caller_user_id };
  });

  const call = buildCallData(await loadCall(outcome.id));
  if (outcome.changed && outcome.missed) {
    const calleeName = call.callee?.display_name ?? null;
    await dispatchMissedCall(await loadCall(outcome.id), outcome.callerId!, calleeName);
  }
  return { call, changed: outcome.changed, missedRecipientId: outcome.missed ? outcome.callerId : undefined };
}

export async function endCall(
  userId: string,
  callId: string,
  reason?: string | null,
): Promise<{ call: CallData; changed: boolean; missedRecipientId?: string }> {
  const outcome = await sequelize.transaction(async (transaction) => {
    const row = await CallSession.findByPk(callId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!row) throw serviceError("Call not found.", "NOT_FOUND");
    assertParticipant(row, userId);

    if (["ended", "rejected", "missed", "cancelled", "failed"].includes(row.status)) {
      return { changed: false, id: row.id, missed: false as const };
    }

    const now = new Date();
    const wasRinging = row.status === "ringing";
    let status: CallStatus = "ended";
    if (wasRinging) {
      status = userId === row.caller_user_id ? "cancelled" : "missed";
    }

    let durationSeconds: number | null = null;
    if (row.status === "accepted" && row.accepted_at) {
      durationSeconds = Math.max(
        0,
        Math.floor((now.getTime() - new Date(row.accepted_at).getTime()) / 1000),
      );
    }

    await row.update(
      {
        status,
        ended_at: now,
        ended_by_user_id: userId,
        end_reason: reason ?? status,
        duration_seconds: durationSeconds,
      },
      { transaction },
    );

    const missed = wasRinging;
    const recipientId = missed ? otherParticipantId(row, userId) : undefined;
    return { changed: true, id: row.id, missed, recipientId };
  });

  const row = await loadCall(outcome.id);
  const call = buildCallData(row);
  if (outcome.changed && outcome.missed && outcome.recipientId) {
    const actorName =
      userId === row.caller_user_id
        ? row.caller?.display_name ?? null
        : row.callee?.display_name ?? null;
    await dispatchMissedCall(row, outcome.recipientId, actorName);
  }
  return { call, changed: outcome.changed, missedRecipientId: outcome.recipientId };
}

export async function failCall(
  userId: string,
  callId: string,
  reason?: string | null,
): Promise<{ call: CallData; changed: boolean }> {
  const outcome = await sequelize.transaction(async (transaction) => {
    const row = await CallSession.findByPk(callId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!row) throw serviceError("Call not found.", "NOT_FOUND");
    assertParticipant(row, userId);
    if (["ended", "rejected", "missed", "cancelled", "failed"].includes(row.status)) {
      return { changed: false, id: row.id };
    }
    const now = new Date();
    let durationSeconds: number | null = null;
    if (row.status === "accepted" && row.accepted_at) {
      durationSeconds = Math.max(
        0,
        Math.floor((now.getTime() - new Date(row.accepted_at).getTime()) / 1000),
      );
    }
    await row.update(
      {
        status: "failed",
        ended_at: now,
        ended_by_user_id: userId,
        end_reason: reason ?? "failed",
        duration_seconds: durationSeconds,
      },
      { transaction },
    );
    return { changed: true, id: row.id };
  });
  return { call: buildCallData(await loadCall(outcome.id)), changed: outcome.changed };
}

export async function endActiveCallsForUserOnDisconnect(userId: string): Promise<void> {
  const calls = await CallSession.findAll({
    where: {
      [Op.and]: [
        { status: { [Op.in]: ["ringing", "accepted"] } },
        { [Op.or]: [{ caller_user_id: userId }, { callee_user_id: userId }] },
      ],
    },
    attributes: ["id"],
  });

  for (const call of calls) {
    try {
      const result = await endCall(userId, call.id, "disconnect");
      if (result.changed) {
        const otherId = otherParticipantId(await CallSession.findByPk(call.id) as CallSession, userId);
        emitToUser(otherId, "call:ended", { call: result.call });
        emitToUser(userId, "call:ended", { call: result.call });
      }
    } catch {
      // best effort on disconnect
    }
  }
}

export function isCallParticipant(call: CallData, userId: string): boolean {
  return call.caller_user_id === userId || call.callee_user_id === userId;
}

export function callOtherUserId(call: CallData, userId: string): string {
  return call.caller_user_id === userId ? call.callee_user_id : call.caller_user_id;
}
