import { describe, expect, it, vi, afterEach } from "vitest";
import {
  ApiError,
  messagingApi,
  type ConversationData,
  type MessageData,
} from "@/lib/api";
import {
  getOtherParticipant,
  getParticipantRole,
  isValidConversationId,
  mapNotificationActionUrl,
  mergeMessages,
  messagePreviewText,
  resolveConversationForContext,
} from "@/lib/messaging";

function makeConversation(
  overrides: Partial<ConversationData> = {},
): ConversationData {
  return {
    id: "conv-1",
    created_by_user_id: "farmer-1",
    listing_id: "listing-1",
    buyer_request_id: null,
    status: "active",
    last_message_at: null,
    participants: [
      {
        user_id: "farmer-1",
        display_name: "Farmer Ada",
        last_read_at: null,
        joined_at: "2026-11-01T00:00:00.000Z",
      },
      {
        user_id: "buyer-1",
        display_name: "Buyer Bola",
        last_read_at: null,
        joined_at: "2026-11-01T00:00:00.000Z",
      },
    ],
    listing: {
      id: "listing-1",
      title: "Fresh tomatoes",
      status: "published",
      farmer_user_id: "farmer-1",
    },
    unread_count: 0,
    created_at: "2026-11-01T00:00:00.000Z",
    updated_at: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeMessage(overrides: Partial<MessageData> = {}): MessageData {
  return {
    id: "msg-1",
    conversation_id: "conv-1",
    sender_user_id: "farmer-1",
    content: "Hello",
    message_type: "text",
    status: "sent",
    delivered_at: null,
    read_at: null,
    attachments: [],
    created_at: "2026-11-01T10:00:00.000Z",
    updated_at: "2026-11-01T10:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("messaging helpers", () => {
  it("validates conversation UUIDs", () => {
    expect(isValidConversationId("3f2504e0-4f89-41d3-9a0c-0305e82c3301")).toBe(
      true,
    );
    expect(isValidConversationId("conv-1")).toBe(false);
    expect(isValidConversationId("not-a-uuid")).toBe(false);
  });

  it("maps conversation notification links to the frontend route", () => {
    expect(
      mapNotificationActionUrl("/conversations/3f2504e0-4f89-41d3-9a0c-0305e82c3301"),
    ).toBe("/messages/3f2504e0-4f89-41d3-9a0c-0305e82c3301");
    expect(mapNotificationActionUrl("/marketplace/listing-1")).toBe(
      "/marketplace/listing-1",
    );
    expect(mapNotificationActionUrl("https://example.com/messages/1")).toBeNull();
    expect(mapNotificationActionUrl(null)).toBeNull();
  });

  it("identifies the other participant and their context role", () => {
    const conversation = makeConversation();
    const other = getOtherParticipant(conversation, "farmer-1");
    expect(other?.user_id).toBe("buyer-1");
    expect(getParticipantRole(conversation, other)).toBeNull();
    expect(
      getParticipantRole(
        makeConversation({
          buyer_request: {
            id: "request-1",
            status: "open",
            buyer_user_id: "buyer-1",
          },
        }),
        other,
      ),
    ).toBe("Buyer");
  });

  it("merges messages by id and sorts chronologically", () => {
    const newer = makeMessage({
      id: "msg-1",
      content: "Updated",
      status: "read",
      updated_at: "2026-11-01T10:05:00.000Z",
    });
    const older = makeMessage({
      id: "msg-2",
      created_at: "2026-11-01T09:00:00.000Z",
      updated_at: "2026-11-01T09:00:00.000Z",
    });

    const result = mergeMessages(
      [makeMessage(), older],
      [newer, makeMessage({ id: "msg-3", created_at: "2026-11-01T11:00:00.000Z" })],
    );

    expect(result.map((message) => message.id)).toEqual([
      "msg-2",
      "msg-1",
      "msg-3",
    ]);
    expect(result[1]?.content).toBe("Updated");
  });



  it("builds preview text for attachment-only messages", () => {
    expect(
      messagePreviewText(
        makeMessage({
          content: "",
          attachments: [
            {
              id: "a1",
              message_id: "msg-1",
              conversation_id: "conv-1",
              attachment_type: "image",
              mime_type: "image/png",
              file_name: "photo.png",
              file_size_bytes: 100,
              duration_seconds: null,
              width: null,
              height: null,
              download_url: "/api/conversations/conv-1/messages/msg-1/attachments/a1/download",
              created_at: "2026-11-01T10:00:00.000Z",
            },
          ],
        }),
      ),
    ).toBe("Sent an image");
  });

  it("resolves an existing conversation after a duplicate error", async () => {
    const conversation = makeConversation();
    vi.spyOn(messagingApi, "createConversation").mockRejectedValue(
      new ApiError(
        409,
        "A conversation already exists for these participants and context.",
      ),
    );
    const list = vi
      .spyOn(messagingApi, "listConversations")
      .mockResolvedValue({
        success: true,
        data: {
          conversations: [conversation],
          total: 1,
          page: 1,
          limit: 50,
          total_pages: 1,
        },
      });

    const id = await resolveConversationForContext("token", {
      participant_user_id: "farmer-1",
      listing_id: "listing-1",
    });

    expect(id).toBe("conv-1");
    expect(list).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({ status: "all", page: 1, limit: 50 }),
    );
  });

  it("reopens an archived duplicate conversation", async () => {
    const archived = makeConversation({ status: "archived" });
    vi.spyOn(messagingApi, "createConversation").mockRejectedValue(
      new ApiError(409, "A conversation already exists."),
    );
    vi.spyOn(messagingApi, "listConversations").mockResolvedValue({
      success: true,
      data: {
        conversations: [archived],
        total: 1,
        page: 1,
        limit: 50,
        total_pages: 1,
      },
    });
    const unarchive = vi
      .spyOn(messagingApi, "unarchiveConversation")
      .mockResolvedValue({
        success: true,
        message: "Conversation unarchived.",
        data: { conversation: makeConversation() },
      });

    const id = await resolveConversationForContext("token", {
      participant_user_id: "farmer-1",
      listing_id: "listing-1",
    });

    expect(id).toBe("conv-1");
    expect(unarchive).toHaveBeenCalledWith("token", "conv-1");
  });
});
