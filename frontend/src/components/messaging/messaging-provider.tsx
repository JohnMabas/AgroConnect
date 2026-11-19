"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { messagingApi, type MessageData } from "@/lib/api";
import { logSignalingFailure } from "@/lib/call-diagnostics";
import {
  connectMessagingSocket,
  releaseMessagingSocket,
  type MessageNewPayload,
  type MessagingSocket,
} from "@/lib/messaging-socket";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface UnreadState {
  total: number;
  byConversation: Record<string, number>;
}

interface MessagingContextValue {
  socket: MessagingSocket | null;
  connectionStatus: ConnectionStatus;
  unreadTotal: number;
  unreadByConversation: Record<string, number>;
  refreshUnreadCount: () => Promise<void>;
  clearConversationUnread: (conversationId: string) => void;
}

const MessagingContext = createContext<MessagingContextValue | null>(null);

interface MessagingProviderProps {
  token: string | null;
  userId: string | null;
  children: React.ReactNode;
}

export function MessagingProvider({ token, userId, children }: MessagingProviderProps) {
  const [socket, setSocket] = useState<MessagingSocket | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [unread, setUnread] = useState<UnreadState>({
    total: 0,
    byConversation: {},
  });

  const refreshUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await messagingApi.getUnreadCount(token);
      const byConversation: Record<string, number> = {};
      for (const item of res.data.conversations) {
        byConversation[item.conversation_id] = item.unread_count;
      }
      setUnread({ total: res.data.total_unread, byConversation });
    } catch {
      return;
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => void refreshUnreadCount(), 0);
    return () => window.clearTimeout(timer);
  }, [token, refreshUnreadCount]);

  useEffect(() => {
    if (!token || !userId) return;
    let active = true;
    const activeSocket = connectMessagingSocket(token);
    queueMicrotask(() => {
      if (active) setSocket(activeSocket);
    });

    const onConnect = () => {
      setConnectionStatus("connected");
      void refreshUnreadCount();
    };
    const onDisconnect = () => setConnectionStatus("disconnected");
    const onError = (error: Error) => {
      logSignalingFailure("socket", error);
      setConnectionStatus("error");
    };
    const onMessageNew = (payload: MessageNewPayload) => {
      const message: MessageData | undefined = payload?.message;
      if (!message || message.sender_user_id === userId) return;
      setUnread((current) => ({
        total: current.total + 1,
        byConversation: {
          ...current.byConversation,
          [message.conversation_id]:
            (current.byConversation[message.conversation_id] ?? 0) + 1,
        },
      }));
    };
    const onConversationChanged = () => {
      void refreshUnreadCount();
    };

    activeSocket.on("connect", onConnect);
    activeSocket.on("disconnect", onDisconnect);
    activeSocket.on("connect_error", onError);
    activeSocket.on("message:new", onMessageNew);
    activeSocket.on("conversation:created", onConversationChanged);
    activeSocket.on("conversation:updated", onConversationChanged);
    if (activeSocket.connected) queueMicrotask(onConnect);

    return () => {
      active = false;
      activeSocket.off("connect", onConnect);
      activeSocket.off("disconnect", onDisconnect);
      activeSocket.off("connect_error", onError);
      activeSocket.off("message:new", onMessageNew);
      activeSocket.off("conversation:created", onConversationChanged);
      activeSocket.off("conversation:updated", onConversationChanged);
      releaseMessagingSocket(activeSocket);
      setSocket(null);
    };
  }, [token, userId, refreshUnreadCount]);

  const clearConversationUnread = useCallback((conversationId: string) => {
    setUnread((current) => {
      const cleared = current.byConversation[conversationId] ?? 0;
      if (cleared === 0) return current;
      return {
        total: Math.max(0, current.total - cleared),
        byConversation: { ...current.byConversation, [conversationId]: 0 },
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      socket,
      connectionStatus,
      unreadTotal: unread.total,
      unreadByConversation: unread.byConversation,
      refreshUnreadCount,
      clearConversationUnread,
    }),
    [
      socket,
      connectionStatus,
      unread,
      refreshUnreadCount,
      clearConversationUnread,
    ],
  );

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging(): MessagingContextValue {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error("useMessaging must be used inside MessagingProvider.");
  }
  return context;
}
