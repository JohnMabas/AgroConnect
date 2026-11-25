import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationData } from "@/lib/api";

const mocks = vi.hoisted(() => {
  const on = vi.fn();
  const off = vi.fn();
  return {
    on,
    off,
    socket: { on, off },
    getUnreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  };
});

vi.mock("@/components/messaging/messaging-provider", () => ({
  useMessaging: () => ({ socket: mocks.socket }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    notificationsApi: {
      ...actual.notificationsApi,
      getUnreadCount: mocks.getUnreadCount,
      markRead: mocks.markRead,
      markAllRead: mocks.markAllRead,
    },
  };
});

import {
  NotificationProvider,
  useNotifications,
} from "@/components/notifications/notification-provider";

function makeNotification(overrides: Partial<NotificationData> = {}): NotificationData {
  return {
    id: "notification-1",
    user_id: "user-1",
    title: "Delivery assigned",
    message: "A transporter was assigned.",
    notification_type: "delivery_assigned",
    channel: "in_app",
    related_entity_type: "delivery",
    related_entity_id: "delivery-1",
    action_url: "/deliveries/delivery-1",
    is_read: false,
    read_at: null,
    created_at: "2026-11-25T10:00:00.000Z",
    updated_at: "2026-11-25T10:00:00.000Z",
    ...overrides,
  };
}

function emit(event: string, payload: unknown) {
  const call = mocks.on.mock.calls.find(([name]) => name === event);
  expect(call).toBeDefined();
  const handler = call?.[1] as (value: unknown) => void;
  handler(payload);
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider token="token-1" userId="user-1">
      {children}
    </NotificationProvider>
  );
}

describe("NotificationProvider", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUnreadCount.mockResolvedValue({ data: { unread_count: 0 } });
    mocks.markRead.mockResolvedValue({ data: {} });
    mocks.markAllRead.mockResolvedValue({ data: {} });
  });

  it("deduplicates repeated notification:new socket events", async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(mocks.getUnreadCount).toHaveBeenCalled());

    mocks.getUnreadCount.mockResolvedValue({ data: { unread_count: 1 } });
    const notification = makeNotification();

    await act(async () => {
      emit("notification:new", { notification });
    });
    expect(result.current.version).toBe(1);
    expect(result.current.lastNotification?.id).toBe("notification-1");

    await act(async () => {
      emit("notification:new", { notification });
    });
    expect(result.current.version).toBe(1);
  });

  it("refreshes state after marking notifications read", async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(mocks.getUnreadCount).toHaveBeenCalled());

    await act(async () => {
      await result.current.markRead("notification-1");
    });
    expect(mocks.markRead).toHaveBeenCalledWith("token-1", "notification-1");

    await act(async () => {
      await result.current.markAllRead();
    });
    expect(mocks.markAllRead).toHaveBeenCalledWith("token-1");
    expect(result.current.unreadCount).toBe(0);
  });
});
