"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { notificationsApi, type NotificationData } from "@/lib/api";
import type { NotificationNewPayload } from "@/lib/messaging-socket";
import { useMessaging } from "@/components/messaging/messaging-provider";

interface NotificationContextValue {
  unreadCount: number;
  version: number;
  lastNotification: NotificationData | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  token: string | null;
  userId: string | null;
  children: React.ReactNode;
}

export function NotificationProvider({
  token,
  userId,
  children,
}: NotificationProviderProps) {
  const { socket } = useMessaging();
  const [unreadCount, setUnreadCount] = useState(0);
  const [version, setVersion] = useState(0);
  const [lastNotification, setLastNotification] =
    useState<NotificationData | null>(null);
  const seenNotifications = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await notificationsApi.getUnreadCount(token);
      setUnreadCount(res.data.unread_count);
    } catch {
      return;
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [token, refresh]);

  useEffect(() => {
    if (!socket) return;

    const onNotificationNew = (payload: NotificationNewPayload) => {
      const notification = payload?.notification;
      if (!notification) return;
      if (!seenNotifications.current.has(notification.id)) {
        if (seenNotifications.current.size > 500) {
          seenNotifications.current.clear();
        }
        seenNotifications.current.add(notification.id);
        if (!notification.is_read) {
          setLastNotification(notification);
        }
        setVersion((current) => current + 1);
      }
      void refresh();
    };
    const onConnect = () => void refresh();

    socket.on("notification:new", onNotificationNew);
    socket.on("connect", onConnect);

    return () => {
      socket.off("notification:new", onNotificationNew);
      socket.off("connect", onConnect);
    };
  }, [socket, refresh, userId]);

  const markRead = useCallback(
    async (id: string) => {
      if (!token) return;
      await notificationsApi.markRead(token, id);
      await refresh();
      setVersion((current) => current + 1);
    },
    [token, refresh],
  );

  const markAllRead = useCallback(async () => {
    if (!token) return;
    await notificationsApi.markAllRead(token);
    setUnreadCount(0);
    setVersion((current) => current + 1);
    await refresh();
  }, [token, refresh]);

  const value = useMemo(
    () => ({
      unreadCount,
      version,
      lastNotification,
      refresh,
      markRead,
      markAllRead,
    }),
    [
      unreadCount,
      version,
      lastNotification,
      refresh,
      markRead,
      markAllRead,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used inside NotificationProvider.");
  }
  return context;
}
