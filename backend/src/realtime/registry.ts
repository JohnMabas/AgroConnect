import type { Server as SocketIOServer } from "socket.io";

let socketServer: SocketIOServer | undefined;

export function setSocketServer(io: SocketIOServer): void {
  socketServer = io;
}

export function getSocketServer(): SocketIOServer | undefined {
  return socketServer;
}

export function clearSocketServer(): void {
  socketServer = undefined;
}

export function conversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/**
 * Broadcast an event to a conversation room and to the personal rooms of every
 * participant. Socket.IO de-duplicates sockets that belong to multiple target
 * rooms, so a connected participant receives the event once.
 */
export function emitToConversation(
  conversationId: string,
  participantUserIds: string[],
  event: string,
  payload: unknown,
): void {
  if (!socketServer) return;

  let emitter = socketServer.to(conversationRoom(conversationId));
  for (const userId of participantUserIds) {
    emitter = emitter.to(userRoom(userId));
  }
  emitter.emit(event, payload);
}

export function emitToUser(
  userId: string,
  event: string,
  payload: unknown,
): void {
  if (!socketServer) return;
  socketServer.to(userRoom(userId)).emit(event, payload);
}
