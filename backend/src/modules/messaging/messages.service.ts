import { randomUUID } from "node:crypto";
import { Op, type Order } from "sequelize";
import { env } from "../../config/env.js";
import {
  Conversation,
  ConversationParticipant,
  Message,
  MessageAttachment,
  User,
  sequelize,
} from "../../database/models/index.js";
import { privateMessageMediaStorage } from "../../integrations/storage/index.js";
import {
  assertConversationParticipant,
  buildMessageAttachmentData,
  buildMessageData,
  serviceError,
} from "./messaging.helpers.js";
import { detectMessageAttachment } from "./message-attachment.validation.js";
import type {
  SendMessageInput,
  ListMessagesQuery,
  MarkReadInput,
} from "./messaging.validation.js";
import type {
  MarkDeliveredResult,
  MarkReadResult,
  MessageAttachmentData,
  MessageData,
  MessageStatus,
  MessageType,
  PaginatedMessages,
  SendMessageResult,
  UnreadCountData,
} from "./messaging.types.js";

type AttachmentRow = MessageAttachment;
type MessageRow = Message & { sender?: User; attachments?: AttachmentRow[] };

export interface PreparedMessageAttachment {
  buffer: Buffer;
  originalName: string;
  attachment_type: "image" | "audio";
  mime_type: string;
  extension: string;
  file_size_bytes: number;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
}

const messageIncludes = [
  { model: User, as: "sender", attributes: ["id", "display_name"] },
  { model: MessageAttachment, as: "attachments" },
];

async function loadMessage(id: string): Promise<MessageData> {
  const row = (await Message.findByPk(id, {
    include: messageIncludes,
  })) as MessageRow | null;

  if (!row) {
    throw serviceError("Message not found.", "NOT_FOUND");
  }

  return buildMessageData(row);
}

export function prepareUploadedAttachments(
  files: Express.Multer.File[],
): PreparedMessageAttachment[] {
  if (files.length > env.MESSAGE_MEDIA_MAX_ATTACHMENTS_PER_MESSAGE) {
    throw serviceError(
      `A message can include at most ${env.MESSAGE_MEDIA_MAX_ATTACHMENTS_PER_MESSAGE} attachments.`,
      "INVALID_OPERATION",
    );
  }

  return files.map((file) => {
    const detected = detectMessageAttachment(file.buffer);
    if (!detected) {
      throw serviceError("Unsupported or invalid attachment content.", "INVALID_MEDIA");
    }

    const maxSize =
      detected.attachment_type === "image"
        ? env.MESSAGE_MEDIA_MAX_IMAGE_SIZE_BYTES
        : env.MESSAGE_MEDIA_MAX_AUDIO_SIZE_BYTES;
    if (file.size > maxSize) {
      throw serviceError("Attachment exceeds the maximum allowed file size.", "INVALID_MEDIA");
    }

    const safeName = (file.originalname || `${detected.attachment_type}.${detected.extension}`)
      .replace(/[\r\n\t]/g, " ")
      .slice(0, 255);

    return {
      buffer: file.buffer,
      originalName: safeName,
      attachment_type: detected.attachment_type,
      mime_type: detected.mime_type,
      extension: detected.extension,
      file_size_bytes: file.size,
      duration_seconds: null,
      width: null,
      height: null,
    };
  });
}

function inferMessageType(
  content: string,
  requested: string | undefined,
  attachments: PreparedMessageAttachment[],
): MessageType {
  if (attachments.length === 0) return "text";
  const hasImage = attachments.some((a) => a.attachment_type === "image");
  const hasAudio = attachments.some((a) => a.attachment_type === "audio");
  let inferred: MessageType = "media";
  if (hasImage && !hasAudio) inferred = content ? "media" : "image";
  if (hasAudio && !hasImage) inferred = content ? "media" : "audio";
  if (hasImage && hasAudio) inferred = "media";

  if (
    requested === "text" ||
    requested === "image" ||
    requested === "audio" ||
    requested === "media"
  ) {
    // Preserve explicit intent when compatible; fall back to inferred.
    if (attachments.length === 0) return "text";
    return requested;
  }
  return inferred;
}

export async function sendMessage(
  userId: string,
  conversationId: string,
  input: SendMessageInput,
  attachments: PreparedMessageAttachment[] = [],
): Promise<SendMessageResult> {
  const content = (input.content ?? "").trim();
  if (attachments.length === 0 && content.length === 0) {
    throw serviceError("Message content cannot be blank.", "INVALID_OPERATION");
  }

  const messageType = inferMessageType(content, input.message_type, attachments);
  let participantIds: string[] = [];
  const messageId = randomUUID();
  const storedKeys: string[] = [];

  try {
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
          id: messageId,
          conversation_id: conversationId,
          sender_user_id: userId,
          content,
          message_type: messageType,
          status: "sent",
          delivered_at: null,
          read_at: null,
        },
        { transaction },
      );

      for (const attachment of attachments) {
        const stored = await privateMessageMediaStorage.saveMedia({
          conversationId,
          messageId,
          buffer: attachment.buffer,
          extension: attachment.extension,
        });
        storedKeys.push(stored.storageKey);

        await MessageAttachment.create(
          {
            message_id: messageId,
            conversation_id: conversationId,
            uploader_user_id: userId,
            attachment_type: attachment.attachment_type,
            storage_key: stored.storageKey,
            mime_type: attachment.mime_type,
            file_name: attachment.originalName,
            file_size_bytes: attachment.file_size_bytes,
            duration_seconds: attachment.duration_seconds,
            width: attachment.width,
            height: attachment.height,
          },
          { transaction },
        );
      }

      await access.conversation.update(
        { last_message_at: message.created_at ?? new Date() },
        { transaction },
      );
    });
  } catch (error) {
    await Promise.allSettled(
      storedKeys.map((key) => privateMessageMediaStorage.deleteMedia(key)),
    );
    throw error;
  }

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
    include: messageIncludes,
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


export async function getMessageAttachmentForDownload(
  userId: string,
  conversationId: string,
  messageId: string,
  attachmentId: string,
): Promise<{
  attachment: MessageAttachmentData;
  buffer: Buffer;
}> {
  await assertConversationParticipant(conversationId, userId);

  const row = await MessageAttachment.findOne({
    where: {
      id: attachmentId,
      message_id: messageId,
      conversation_id: conversationId,
    },
  });
  if (!row) {
    throw serviceError("Attachment not found.", "NOT_FOUND");
  }

  const buffer = await privateMessageMediaStorage.readMedia(row.storage_key);
  return {
    attachment: buildMessageAttachmentData(row),
    buffer,
  };
}
