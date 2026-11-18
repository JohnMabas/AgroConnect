import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MessageData } from "@/lib/api";
import { MessageList } from "@/components/messaging/message-list";

function makeMessage(overrides: Partial<MessageData> = {}): MessageData {
  return {
    id: "msg-1",
    conversation_id: "conv-1",
    sender_user_id: "farmer-1",
    content: "Is this still available?",
    message_type: "text",
    status: "read",
    delivered_at: "2026-11-01T10:00:00.000Z",
    read_at: "2026-11-01T10:01:00.000Z",
    attachments: [],
    created_at: "2026-11-01T10:00:00.000Z",
    updated_at: "2026-11-01T10:01:00.000Z",
    ...overrides,
  };
}

describe("MessageList", () => {
  it("renders messages with read status for the current user", () => {
    render(
      <MessageList
        messages={[makeMessage()]}
        currentUserId="farmer-1"
        hasOlder={false}
        loadingOlder={false}
        onLoadOlder={() => {}}
      />,
    );

    expect(screen.getByText("Is this still available?")).toBeTruthy();
    expect(screen.getByLabelText("Status: Read")).toBeTruthy();
  });

  it("does not show a status label for incoming messages", () => {
    render(
      <MessageList
        messages={[makeMessage({ sender_user_id: "buyer-1" })]}
        currentUserId="farmer-1"
        hasOlder={false}
        loadingOlder={false}
        onLoadOlder={() => {}}
      />,
    );

    expect(screen.queryByLabelText(/Status:/)).toBeNull();
  });

  it("loads older messages", () => {
    const onLoadOlder = vi.fn();
    render(
      <MessageList
        messages={[makeMessage()]}
        currentUserId="buyer-1"
        hasOlder
        loadingOlder={false}
        onLoadOlder={onLoadOlder}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Load older messages" }));

    expect(onLoadOlder).toHaveBeenCalledOnce();
  });
});
