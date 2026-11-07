import { Op, type Order } from "sequelize";
import {
  Conversation,
  ConversationParticipant,
  Message,
  User,
  sequelize,
} from "../../database/models/index.js";
import {
  assertConversationParticipant,
  buildMessageData,
  serviceError,
} from "./messaging.helpers.js";
import type {
  SendMessageInput,
  ListMessagesQuery,
  MarkReadInput,
} from "./messaging.validation.js";
import type {
  MarkDeliveredResult,
  MarkReadResult,
  MessageData,
  MessageStatus,
  PaginatedMessages,
  SendMessageResult,
  UnreadCountData,
} from "./messaging.types.js";

type MessageRow = Message & { sender?: User };

async function loadMessage(id: string): Promise<MessageData> {
  const row = (await Message.findByPk(id, {
    include: [{ model: User, as: "sender", attributes: ["id", "display_name"] }],
  })) as MessageRow | null;

  if (!row) {
    throw serviceError("Message not found.", "NOT_FOUND");
  }

  return buildMessageData(row);
}

export async function sendMessage(
  userId: string,
  conversationId: string,
  input: SendMessageInput,
): Promise<SendMessageResult> {
  const content = input.content.trim();
  let participantIds: string[] = [];
  let messageId = "";

  await sequelize.transaction(async (transaction) => {
    const access = await assertConversationParticipant(
      conversationId,
      userId,
      transaction,
    );

    if (access.conversation.status !== "active") {
      throw serviceError(
        "Messages can only be sent to active conversations.",
        "INVALID_OPERATION",
      );
    }

    participantIds = access.participantIds;

    const message = await Message.create(
      {
        conversation_id: conversationId,
        sender_user_id: userId,
        content,
        message_type: input.message_type ?? "text",
        status: "sent",
        delivered_at: null,
        read_at: null,
      },
      { transaction },
    );

    messageId = message.id;

    await access.conversation.update(
      { last_message_at: message.created_at ?? new Date() },
      { transaction },
    );
  });

  return {
    message: await loadMessage(messageId),
    participant_user_ids: participantIds,
  };
}

export async function listMessages(
  userId: string,
  conversationId: string,
  filters: ListMessagesQuery,
): Promise<PaginatedMessages> {
  await assertConversationParticipant(conversationId, userId);

  const where: Record<string, unknown> = { conversation_id: conversationId };
  if (filters.before) {
    where.created_at = { [Op.lt]: new Date(filters.before) };
  }

  const direction = filters.order === "asc" ? "ASC" : "DESC";
  const order: Order = [
    ["created_at", direction],
    ["id", direction],
  ];

  const { count, rows } = await Message.findAndCountAll({
    where,
    include: [{ model: User, as: "sender", attributes: ["id", "display_name"] }],
    order,
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit,
    distinct: true,
  });

  return {
    messages: (rows as MessageRow[]).map(buildMessageData),
    total: count,
    page: filters.page,
    limit: filters.limit,
    total_pages: Math.ceil(count / filters.limit),
  };
}

export async function markConversationRead(
  userId: string,
  conversationId: string,
  input: MarkReadInput,
): Promise<MarkReadResult> {
  const access = await assertConversationParticipant(conversationId, userId);

  let cutoff = new Date();

  if (input.message_id) {
    const target = await Message.findOne({
      where: { id: input.message_id, conversation_id: conversationId },
    });
    if (!target) {
      throw serviceError("Message not found.", "NOT_FOUND");
    }
    cutoff = target.created_at!;
  }

  const readAt = new Date();

  const result = await sequelize.transaction(async (transaction) => {
    const unreadMessages = await Message.findAll({
      where: {
        conversation_id: conversationId,
        sender_user_id: { [Op.ne]: userId },
        status: { [Op.ne]: "read" },
        created_at: { [Op.lte]: cutoff },
      },
      attributes: ["id"],
      transaction,
    });

    const messageIds = unreadMessages.map((message) => message.id);

    if (messageIds.length > 0) {
      await Message.update(
        { status: "read", read_at: readAt },
        {
          where: { id: { [Op.in]: messageIds } },
          transaction,
        },
      );
    }

    const participation = await ConversationParticipant.findOne({
      where: { conversation_id: conversationId, user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!participation) {
      throw serviceError("Conversation not found.", "NOT_FOUND");
    }

    const previousReadAt = participation.last_read_at;
    const effectiveReadAt =
      previousReadAt && previousReadAt > cutoff ? previousReadAt : cutoff;

    if (!previousReadAt || effectiveReadAt > previousReadAt) {
      await participation.update(
        { last_read_at: effectiveReadAt },
        { transaction },
      );
    }

    return {
      conversationId,
      messageIds,
      readAt,
    };
  });

  return {
    conversation_id: result.conversationId,
    reader_user_id: userId,
    read_at: result.readAt,
    message_ids: result.messageIds,
    participant_user_ids: access.participantIds,
  };
}

export async function markMessageDelivered(
  userId: string,
  conversationId: string,
  messageId: string,
): Promise<MarkDeliveredResult> {
  const access = await assertConversationParticipant(conversationId, userId);

  const message = await Message.findOne({
    where: { id: messageId, conversation_id: conversationId },
  });
  if (!message) {
    throw serviceError("Message not found.", "NOT_FOUND");
  }

  if (message.sender_user_id === userId) {
    throw serviceError(
      "You cannot acknowledge delivery of your own message.",
      "INVALID_OPERATION",
    );
  }

  if (message.status === "sent") {
    await message.update({ status: "delivered", delivered_at: new Date() });
  }

  return {
    conversation_id: conversationId,
    message_id: message.id,
    status: (message.status ?? "sent") as MessageStatus,
    delivered_at: message.delivered_at ?? null,
    participant_user_ids: access.participantIds,
  };
}

export async function getUnreadCounts(userId: string): Promise<UnreadCountData> {
  const participations = await ConversationParticipant.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Conversation,
        as: "conversation",
        required: true,
        where: { status: "active" },
        attributes: ["id"],
      },
    ],
  });

  const counts = await Promise.all(
    participations.map(async (participation) => {
      const where: Record<string, unknown> = {
        conversation_id: participation.conversation_id,
        sender_user_id: { [Op.ne]: userId },
      };
      if (participation.last_read_at) {
        where.created_at = { [Op.gt]: participation.last_read_at };
      }

      const unread = await Message.count({ where });
      return {
        conversation_id: participation.conversation_id,
        unread_count: unread,
      };
    }),
  );

  return {
    total_unread: counts.reduce((total, item) => total + item.unread_count, 0),
    conversations: counts,
  };
}
