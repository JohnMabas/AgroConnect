import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { allowedOrigins } from "../config/cors.js";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../services/token.service.js";
import { fetchUserRoles } from "../services/user-roles.service.js";
import {
  SocketConversationSchema,
  SocketMarkDeliveredSchema,
  SocketMarkReadSchema,
  SocketSendMessageSchema,
} from "../modules/messaging/messaging.validation.js";
import type { MessageType } from "../database/models/message.model.js";
import {
  assertConversationParticipant,
} from "../modules/messaging/messaging.helpers.js";
import {
  markConversationRead,
  markMessageDelivered,
  sendMessage,
} from "../modules/messaging/messages.service.js";
import { publishMessageCreated } from "../modules/messaging/messaging.events.js";
import {
  acceptCall,
  callOtherUserId,
  createCall,
  endActiveCallsForUserOnDisconnect,
  endCall,
  getCallById,
  rejectCall,
} from "../modules/calls/calls.service.js";
import {
  SocketCallActionSchema,
  SocketCallIceSchema,
  SocketCallInviteSchema,
  SocketCallSdpSchema,
} from "../modules/calls/calls.validation.js";
import {
  clearSocketServer,
  conversationRoom,
  emitToConversation,
  emitToUser,
  setSocketServer,
  userRoom,
} from "./registry.js";

interface SocketUser {
  sub: string;
  roles: string[];
}

interface RateState {
  windowStartedAt: number;
  count: number;
}

interface AckResponse {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

type Ack = (response: AckResponse) => void;

const MESSAGE_RATE_WINDOW_MS = 60 * 1000;
const MESSAGE_RATE_LIMIT = 60;

let socketServer: SocketIOServer | undefined;

function extractToken(socket: Socket): string | undefined {
  const authToken = socket.handshake.auth?.token as unknown;
  if (typeof authToken === "string" && authToken.trim() !== "") {
    return authToken.trim();
  }

  const header = socket.handshake.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }

  return undefined;
}

function respond(ack: unknown, response: AckResponse): void {
  if (typeof ack === "function") {
    (ack as Ack)(response);
  }
}

function socketError(error: unknown): AckResponse {
  const code = (error as { code?: string }).code;

  switch (code) {
    case "NOT_FOUND":
      return {
        success: false,
        error: { code: "NOT_FOUND", message: (error as Error).message },
      };
    case "FORBIDDEN":
      return {
        success: false,
        error: { code: "FORBIDDEN", message: (error as Error).message },
      };
    case "INVALID_OPERATION":
    case "INVALID_MEDIA":
      return {
        success: false,
        error: {
          code: "INVALID_OPERATION",
          message: (error as Error).message,
        },
      };
    default:
      console.error("[socket] Event failed:", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to process the request.",
        },
      };
  }
}

function allowRate(
  socket: Socket,
  key: "messageRate" | "callRate",
  limit: number,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const state = socket.data[key] as RateState | undefined;

  if (!state || now - state.windowStartedAt >= windowMs) {
    socket.data[key] = { windowStartedAt: now, count: 1 } satisfies RateState;
    return true;
  }

  if (state.count >= limit) {
    return false;
  }

  state.count += 1;
  return true;
}

export function createSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  socketServer = io;
  setSocketServer(io);

  io.use(async (socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) {
        next(new Error("Authentication required."));
        return;
      }

      const payload = verifyAccessToken(token);
      const roles = await fetchUserRoles(payload.sub);

      socket.data.user = { sub: payload.sub, roles } satisfies SocketUser;
      next();
    } catch {
      next(new Error("Invalid or expired access token."));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser;
    socket.join(userRoom(user.sub));

    socket.emit("connected", { user_id: user.sub });

    socket.on("conversation:join", async (payload: unknown, ack: unknown) => {
      try {
        const parsed = SocketConversationSchema.safeParse(payload);
        if (!parsed.success) {
          respond(ack, {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "A valid conversation_id is required.",
            },
          });
          return;
        }

        const access = await assertConversationParticipant(
          parsed.data.conversation_id,
          user.sub,
        );

        socket.join(conversationRoom(parsed.data.conversation_id));
        respond(ack, {
          success: true,
          data: {
            conversation_id: parsed.data.conversation_id,
            participant_user_ids: access.participantIds,
          },
        });
      } catch (error) {
        respond(ack, socketError(error));
      }
    });

    socket.on("conversation:leave", (payload: unknown, ack: unknown) => {
      const parsed = SocketConversationSchema.safeParse(payload);
      if (!parsed.success) {
        respond(ack, {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid conversation_id is required.",
          },
        });
        return;
      }

      socket.leave(conversationRoom(parsed.data.conversation_id));
      respond(ack, {
        success: true,
        data: { conversation_id: parsed.data.conversation_id },
      });
    });

    socket.on("message:send", async (payload: unknown, ack: unknown) => {
      try {
        if (!allowRate(socket, "messageRate", MESSAGE_RATE_LIMIT, MESSAGE_RATE_WINDOW_MS)) {
          respond(ack, {
            success: false,
            error: {
              code: "RATE_LIMITED",
              message: "Too many messages. Please slow down and try again shortly.",
            },
          });
          return;
        }

        const parsed = SocketSendMessageSchema.safeParse(payload);
        if (!parsed.success) {
          respond(ack, {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message:
                parsed.error.errors[0]?.message ?? "Invalid message payload.",
            },
          });
          return;
        }

        const result = await sendMessage(
          user.sub,
          parsed.data.conversation_id,
          {
            content: parsed.data.content,
            message_type: parsed.data.message_type as MessageType,
          },
        );

        emitToConversation(
          parsed.data.conversation_id,
          result.participant_user_ids,
          "message:new",
          { message: result.message },
        );

        publishMessageCreated({
          conversation_id: parsed.data.conversation_id,
          message: result.message,
          participant_user_ids: result.participant_user_ids,
        });

        respond(ack, { success: true, data: { message: result.message } });
      } catch (error) {
        respond(ack, socketError(error));
      }
    });

    socket.on("message:read", async (payload: unknown, ack: unknown) => {
      try {
        const parsed = SocketMarkReadSchema.safeParse(payload);
        if (!parsed.success) {
          respond(ack, {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "A valid conversation_id is required.",
            },
          });
          return;
        }

        const result = await markConversationRead(
          user.sub,
          parsed.data.conversation_id,
          { message_id: parsed.data.message_id },
        );

        emitToConversation(
          parsed.data.conversation_id,
          result.participant_user_ids,
          "message:read",
          {
            conversation_id: result.conversation_id,
            reader_user_id: result.reader_user_id,
            read_at: result.read_at,
            message_ids: result.message_ids,
          },
        );

        respond(ack, { success: true, data: result });
      } catch (error) {
        respond(ack, socketError(error));
      }
    });

    socket.on("message:delivered", async (payload: unknown, ack: unknown) => {
      try {
        const parsed = SocketMarkDeliveredSchema.safeParse(payload);
        if (!parsed.success) {
          respond(ack, {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "conversation_id and message_id are required.",
            },
          });
          return;
        }

        const result = await markMessageDelivered(
          user.sub,
          parsed.data.conversation_id,
          parsed.data.message_id,
        );

        emitToConversation(
          parsed.data.conversation_id,
          result.participant_user_ids,
          "message:delivered",
          {
            conversation_id: result.conversation_id,
            message_id: result.message_id,
            status: result.status,
            delivered_at: result.delivered_at,
          },
        );

        respond(ack, { success: true, data: result });
      } catch (error) {
        respond(ack, socketError(error));
      }
    });

    // ─── Call signaling (authenticated, participant-only) ──────────────────

    socket.on("call:invite", async (payload: unknown, ack: unknown) => {
      try {
        if (!allowRate(socket, "callRate", env.CALL_RATE_LIMIT_PER_MINUTE)) {
          respond(ack, {
            success: false,
            error: { code: "RATE_LIMITED", message: "Too many call requests." },
          });
          return;
        }
        const parsed = SocketCallInviteSchema.safeParse(payload);
        if (!parsed.success) {
          respond(ack, {
            success: false,
            error: { code: "VALIDATION_ERROR", message: "Invalid call invite payload." },
          });
          return;
        }
        const call = await createCall(user.sub, parsed.data);
        emitToUser(call.callee_user_id, "call:incoming", { call });
        respond(ack, { success: true, data: { call } });
      } catch (error) {
        respond(ack, socketError(error));
      }
    });

    socket.on("call:accept", async (payload: unknown, ack: unknown) => {
      try {
        if (!allowRate(socket, "callRate", env.CALL_RATE_LIMIT_PER_MINUTE)) {
          respond(ack, { success: false, error: { code: "RATE_LIMITED", message: "Too many call requests." } });
          return;
        }
        const parsed = SocketCallActionSchema.safeParse(payload);
        if (!parsed.success) {
          respond(ack, { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid payload." } });
          return;
        }
        const result = await acceptCall(user.sub, parsed.data.call_id);
        if (result.changed) {
          emitToUser(result.call.caller_user_id, "call:accepted", { call: result.call });
        }
        respond(ack, { success: true, data: { call: result.call } });
      } catch (error) {
        respond(ack, socketError(error));
      }
    });

    socket.on("call:reject", async (payload: unknown, ack: unknown) => {
      try {
        if (!allowRate(socket, "callRate", env.CALL_RATE_LIMIT_PER_MINUTE)) {
          respond(ack, { success: false, error: { code: "RATE_LIMITED", message: "Too many call requests." } });
          return;
        }
        const parsed = SocketCallActionSchema.safeParse(payload);
        if (!parsed.success) {
          respond(ack, { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid payload." } });
          return;
        }
        const result = await rejectCall(user.sub, parsed.data.call_id, parsed.data.reason);
        if (result.changed) {
          emitToUser(result.call.caller_user_id, "call:rejected", { call: result.call });
        }
        respond(ack, { success: true, data: { call: result.call } });
      } catch (error) {
        respond(ack, socketError(error));
      }
    });

    socket.on("call:end", async (payload: unknown, ack: unknown) => {
      try {
        if (!allowRate(socket, "callRate", env.CALL_RATE_LIMIT_PER_MINUTE)) {
          respond(ack, { success: false, error: { code: "RATE_LIMITED", message: "Too many call requests." } });
          return;
        }
        const parsed = SocketCallActionSchema.safeParse(payload);
        if (!parsed.success) {
          respond(ack, { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid payload." } });
          return;
        }
        const result = await endCall(user.sub, parsed.data.call_id, parsed.data.reason);
        if (result.changed) {
          const otherId = callOtherUserId(result.call, user.sub);
          emitToUser(otherId, "call:ended", { call: result.call });
        }
        respond(ack, { success: true, data: { call: result.call } });
      } catch (error) {
        respond(ack, socketError(error));
      }
    });

    socket.on("call:offer", async (payload: unknown, ack: unknown) => {
      try {
        if (!allowRate(socket, "callRate", env.CALL_RATE_LIMIT_PER_MINUTE)) {
          respond(ack, { success: false, error: { code: "RATE_LIMITED", message: "Too many call requests." } });
          return;
        }
        const parsed = SocketCallSdpSchema.safeParse(payload);
        if (!parsed.success) {
          respond(ack, { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid payload." } });
          return;
        }
        const call = await getCallById(user.sub, parsed.data.call_id);
        const otherId = callOtherUserId(call, user.sub);
        emitToUser(otherId, "call:offer", {
          call_id: parsed.data.call_id,
          sdp: parsed.data.sdp,
        });
        respond(ack, { success: true, data: { call_id: parsed.data.call_id } });
      } catch (error) {
        respond(ack, socketError(error));
      }
    });

    socket.on("call:answer", async (payload: unknown, ack: unknown) => {
      try {
        if (!allowRate(socket, "callRate", env.CALL_RATE_LIMIT_PER_MINUTE)) {
          respond(ack, { success: false, error: { code: "RATE_LIMITED", message: "Too many call requests." } });
          return;
        }
        const parsed = SocketCallSdpSchema.safeParse(payload);
        if (!parsed.success) {
          respond(ack, { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid payload." } });
          return;
        }
        const call = await getCallById(user.sub, parsed.data.call_id);
        const otherId = callOtherUserId(call, user.sub);
        emitToUser(otherId, "call:answer", {
          call_id: parsed.data.call_id,
          sdp: parsed.data.sdp,
        });
        respond(ack, { success: true, data: { call_id: parsed.data.call_id } });
      } catch (error) {
        respond(ack, socketError(error));
      }
    });

    socket.on("call:ice-candidate", async (payload: unknown, ack: unknown) => {
      try {
        if (!allowRate(socket, "callRate", env.CALL_RATE_LIMIT_PER_MINUTE)) {
          respond(ack, { success: false, error: { code: "RATE_LIMITED", message: "Too many call requests." } });
          return;
        }
        const parsed = SocketCallIceSchema.safeParse(payload);
        if (!parsed.success) {
          respond(ack, { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid payload." } });
          return;
        }
        const call = await getCallById(user.sub, parsed.data.call_id);
        const otherId = callOtherUserId(call, user.sub);
        emitToUser(otherId, "call:ice-candidate", {
          call_id: parsed.data.call_id,
          candidate: parsed.data.candidate,
        });
        respond(ack, { success: true, data: { call_id: parsed.data.call_id } });
      } catch (error) {
        respond(ack, socketError(error));
      }
    });

    socket.on("disconnect", () => {
      void endActiveCallsForUserOnDisconnect(user.sub).catch((error) => {
        console.error("[socket] Failed to end active calls on disconnect:", error);
      });
    });
  });

  return io;
}

export async function stopSocketServer(): Promise<void> {
  if (!socketServer) return;

  const io = socketServer;
  socketServer = undefined;
  clearSocketServer();

  await new Promise<void>((resolve) => {
    io.close(() => resolve());
  });
}
