import { io, type Socket } from "socket.io-client";
import type {
  CallData,
  ConversationData,
  DeliveryData,
  DeliveryLocationData,
  MarkReadResult,
  MessageData,
  NotificationData,
} from "@/lib/api";
import { getStoredAccessToken } from "@/lib/session";
import { logSignalingFailure } from "@/lib/call-diagnostics";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export type MessagingSocket = Socket;

interface SocketState {
  socket: MessagingSocket | null;
  token: string | null;
  refs: number;
}

const state: SocketState = {
  socket: null,
  token: null,
  refs: 0,
};

export function getSocketServerUrl(): string {
  try {
    return new URL(API_BASE).origin;
  } catch {
    return "http://localhost:5000";
  }
}

export function connectMessagingSocket(token: string): MessagingSocket {
  if (typeof window === "undefined") {
    throw new Error("Messaging socket can only be created in the browser.");
  }

  if (state.socket && state.token === token) {
    state.refs += 1;
    if (state.socket.disconnected) state.socket.connect();
    return state.socket;
  }

  if (state.socket) {
    state.socket.disconnect();
    state.socket = null;
  }

  const socket = io(getSocketServerUrl(), {
    autoConnect: true,
    auth: (callback) => {
      callback({ token: getStoredAccessToken() ?? token });
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    withCredentials: true,
  });

  state.socket = socket;
  state.token = token;
  state.refs = 1;
  return socket;
}

export function releaseMessagingSocket(socket: MessagingSocket | null): void {
  if (!socket || socket !== state.socket) {
    socket?.disconnect();
    return;
  }
  state.refs = Math.max(0, state.refs - 1);
  if (state.refs === 0) {
    state.socket.disconnect();
    state.socket = null;
    state.token = null;
  }
}

export type SocketAck<T = unknown> =
  | { success: true; data?: T }
  | { success: false; error?: { code?: string; message?: string } };

export function joinConversationRoom(
  socket: MessagingSocket,
  conversationId: string,
  onResult?: (ack: SocketAck) => void,
): void {
  socket.emit(
    "conversation:join",
    { conversation_id: conversationId },
    (ack: SocketAck) => {
      onResult?.(ack ?? { success: false, error: { message: "No response from server." } });
    },
  );
}

export function leaveConversationRoom(
  socket: MessagingSocket,
  conversationId: string,
): void {
  socket.emit("conversation:leave", { conversation_id: conversationId });
}

export interface MessageNewPayload {
  message: MessageData;
}

export interface ConversationUpdatedPayload {
  conversation: ConversationData;
}

export interface ConversationCreatedPayload {
  conversation: ConversationData;
}

export interface MessageReadPayload {
  conversation_id: string;
  reader_user_id: string;
  read_at: string;
  message_ids: string[];
}

export interface MessageDeliveredPayload {
  conversation_id: string;
  message_id: string;
  status: string;
  delivered_at: string | null;
}

export interface NotificationNewPayload {
  notification: NotificationData;
}

export interface DeliveryUpdatedPayload {
  delivery: DeliveryData;
  action: string;
  actor_user_id: string | null;
}

export interface DeliveryLocationUpdatedPayload {
  delivery: DeliveryData;
  location: DeliveryLocationData;
  actor_user_id: string | null;
}

export function markDeliveredViaSocket(
  socket: MessagingSocket,
  conversationId: string,
  messageId: string,
): void {
  socket.emit(
    "message:delivered",
    { conversation_id: conversationId, message_id: messageId },
    () => undefined,
  );
}

export function markReadViaSocket(
  socket: MessagingSocket,
  conversationId: string,
  messageId?: string,
): Promise<SocketAck<MarkReadResult>> {
  return new Promise((resolve) => {
    socket.emit(
      "message:read",
      messageId
        ? { conversation_id: conversationId, message_id: messageId }
        : { conversation_id: conversationId },
      (ack: SocketAck<MarkReadResult>) => {
        resolve(ack ?? { success: false, error: { message: "No response from server." } });
      },
    );
  });
}

export function sendMessageViaSocket(
  socket: MessagingSocket,
  conversationId: string,
  content: string,
): Promise<SocketAck<{ message: MessageData }>> {
  return new Promise((resolve) => {
    socket.emit(
      "message:send",
      { conversation_id: conversationId, content, message_type: "text" },
      (ack: SocketAck<{ message: MessageData }>) => {
        resolve(ack ?? { success: false, error: { message: "No response from server." } });
      },
    );
  });
}


// ─── Call signaling events ────────────────────────────────────────────────────

export interface CallEventPayload {
  call: CallData;
}

export interface CallSdpPayload {
  call_id: string;
  sdp: unknown;
}

export interface CallIcePayload {
  call_id: string;
  candidate: unknown;
}

function emitWithAck<T = unknown>(
  socket: MessagingSocket,
  event: string,
  payload: unknown,
): Promise<SocketAck<T>> {
  return new Promise((resolve) => {
    socket.emit(event, payload, (ack: SocketAck<T>) => {
      if (!ack) {
        logSignalingFailure(event, { code: "NO_ACK" });
        resolve({ success: false, error: { message: "No response from server." } });
        return;
      }
      if (!ack.success && event.startsWith("call:")) {
        logSignalingFailure(event, ack.error);
      }
      resolve(ack);
    });
  });
}

export function inviteCallViaSocket(
  socket: MessagingSocket,
  payload: { conversation_id: string; callee_user_id: string; call_type: "audio" | "video" },
): Promise<SocketAck<{ call: CallData }>> {
  return emitWithAck(socket, "call:invite", payload);
}

export function acceptCallViaSocket(
  socket: MessagingSocket,
  callId: string,
): Promise<SocketAck<{ call: CallData }>> {
  return emitWithAck(socket, "call:accept", { call_id: callId });
}

export function rejectCallViaSocket(
  socket: MessagingSocket,
  callId: string,
  reason?: string,
): Promise<SocketAck<{ call: CallData }>> {
  return emitWithAck(socket, "call:reject", reason ? { call_id: callId, reason } : { call_id: callId });
}

export function endCallViaSocket(
  socket: MessagingSocket,
  callId: string,
  reason?: string,
): Promise<SocketAck<{ call: CallData }>> {
  return emitWithAck(socket, "call:end", reason ? { call_id: callId, reason } : { call_id: callId });
}

export function sendCallOfferViaSocket(
  socket: MessagingSocket,
  callId: string,
  sdp: RTCSessionDescriptionInit,
): Promise<SocketAck> {
  return emitWithAck(socket, "call:offer", { call_id: callId, sdp });
}

export function sendCallAnswerViaSocket(
  socket: MessagingSocket,
  callId: string,
  sdp: RTCSessionDescriptionInit,
): Promise<SocketAck> {
  return emitWithAck(socket, "call:answer", { call_id: callId, sdp });
}

export function sendCallIceCandidateViaSocket(
  socket: MessagingSocket,
  callId: string,
  candidate: RTCIceCandidateInit,
): Promise<SocketAck> {
  return emitWithAck(socket, "call:ice-candidate", { call_id: callId, candidate });
}
