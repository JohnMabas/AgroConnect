import type { NextFunction, Request, Response } from "express";
import { pipeline } from "node:stream/promises";
import { z } from "zod";
import {
  ConversationIdSchema,
  CreateConversationSchema,
  ListConversationsQuerySchema,
  ListMessagesQuerySchema,
  MarkReadSchema,
  MessageIdSchema,
  SendMessageSchema,
  type SendMessageInput,
} from "./messaging.validation.js";
import {
  archiveConversation,
  blockConversation,
  createConversation,
  getConversationById,
  listConversations,
  unarchiveConversation,
  unblockConversation,
} from "./conversations.service.js";
import {
  getMessageAttachmentForDownload,
  listMessages,
  markConversationRead,
  prepareUploadedAttachments,
  sendMessage,
} from "./messages.service.js";
import { publishMessageCreated } from "./messaging.events.js";
import { emitToConversation, emitToUser } from "../../realtime/registry.js";
import {
  handleMessagingServiceError,
  parseConversationId,
  rejectSenderImpersonation,
  requireMessagingAuth,
  zodErrorToFields,
} from "./messaging.controller-helpers.js";

// ─── POST /api/conversations ─────────────────────────────────────────────────

export async function createConversationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireMessagingAuth(req, res)) return;

    const parsed = CreateConversationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const conversation = await createConversation(req.user!.sub, parsed.data);
    const participantIds = conversation.participants.map(
      (participant) => participant.user_id,
    );

    for (const participantId of participantIds) {
      emitToUser(participantId, "conversation:created", { conversation });
    }

    res.status(201).json({
      success: true,
      message: "Conversation created.",
      data: { conversation },
    });
  } catch (err) {
    handleMessagingServiceError(err, res, next);
  }
}

// ─── GET /api/conversations ──────────────────────────────────────────────────

export async function listConversationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireMessagingAuth(req, res)) return;

    const parsed = ListConversationsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await listConversations(req.user!.sub, parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/conversations/:id ──────────────────────────────────────────────

export async function getConversationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireMessagingAuth(req, res)) return;

    const id = parseConversationId(req, res, ConversationIdSchema);
    if (!id) return;

    const conversation = await getConversationById(req.user!.sub, id);
    res.json({ success: true, data: { conversation } });
  } catch (err) {
    handleMessagingServiceError(err, res, next);
  }
}

// ─── Conversation status transitions ─────────────────────────────────────────

function conversationTransitionHandler(
  action: (userId: string, id: string) => Promise<Awaited<ReturnType<typeof getConversationById>>>,
  message: string,
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!requireMessagingAuth(req, res)) return;

      const id = parseConversationId(req, res, ConversationIdSchema);
      if (!id) return;

      const conversation = await action(req.user!.sub, id);
      const participantIds = conversation.participants.map(
        (participant) => participant.user_id,
      );
      emitToConversation(id, participantIds, "conversation:updated", {
        conversation,
      });

      res.json({ success: true, message, data: { conversation } });
    } catch (err) {
      handleMessagingServiceError(err, res, next);
    }
  };
}

export const archiveConversationHandler = conversationTransitionHandler(
  archiveConversation,
  "Conversation archived.",
);

export const unarchiveConversationHandler = conversationTransitionHandler(
  unarchiveConversation,
  "Conversation unarchived.",
);

export const blockConversationHandler = conversationTransitionHandler(
  blockConversation,
  "Conversation blocked.",
);

export const unblockConversationHandler = conversationTransitionHandler(
  unblockConversation,
  "Conversation unblocked.",
);

// ─── POST /api/conversations/:id/messages ────────────────────────────────────

export async function sendMessageHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireMessagingAuth(req, res)) return;

    const userId = req.user!.sub;
    if (rejectSenderImpersonation(req, res, userId)) return;

    const id = parseConversationId(req, res, ConversationIdSchema);
    if (!id) return;

    const isMultipart = String(req.headers["content-type"] ?? "").includes(
      "multipart/form-data",
    );

    let input: { content: string; message_type?: string };
    let files: Express.Multer.File[] = [];

    if (isMultipart) {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const content = typeof body.content === "string" ? body.content : "";
      const messageType =
        typeof body.message_type === "string" ? body.message_type : undefined;
      const parsed = SendMessageSchema.safeParse({
        content,
        message_type: messageType ?? "text",
      });
      if (!parsed.success) {
        res.status(422).json({
          success: false,
          message: "Validation failed.",
          errors: zodErrorToFields(parsed.error),
        });
        return;
      }
      input = parsed.data;
      files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
      if (files.length === 0 && content.trim().length === 0) {
        res.status(422).json({
          success: false,
          error: { message: "Message content or at least one attachment is required." },
        });
        return;
      }
    } else {
      const parsed = SendMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(422).json({
          success: false,
          message: "Validation failed.",
          errors: zodErrorToFields(parsed.error),
        });
        return;
      }
      input = parsed.data;
      files = [];
    }

    const preparedAttachments =
      files.length > 0 ? prepareUploadedAttachments(files) : [];

    const result = await sendMessage(
      userId,
      id,
      input as SendMessageInput,
      preparedAttachments,
    );

    publishMessageCreated({
      conversation_id: id,
      message: result.message,
      participant_user_ids: result.participant_user_ids,
    });

    res.status(201).json({
      success: true,
      message: "Message sent.",
      data: { message: result.message },
    });
  } catch (err) {
    handleMessagingServiceError(err, res, next);
  }
}

// ─── GET /api/conversations/:id/messages ─────────────────────────────────────

export async function listMessagesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireMessagingAuth(req, res)) return;

    const id = parseConversationId(req, res, ConversationIdSchema);
    if (!id) return;

    const parsed = ListMessagesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await listMessages(req.user!.sub, id, parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    handleMessagingServiceError(err, res, next);
  }
}

// ─── PATCH /api/conversations/:id/read ───────────────────────────────────────

export async function markConversationReadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireMessagingAuth(req, res)) return;

    const id = parseConversationId(req, res, ConversationIdSchema);
    if (!id) return;

    const parsed = MarkReadSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await markConversationRead(req.user!.sub, id, parsed.data);

    emitToConversation(id, result.participant_user_ids, "message:read", {
      conversation_id: result.conversation_id,
      reader_user_id: result.reader_user_id,
      read_at: result.read_at,
      message_ids: result.message_ids,
    });

    res.json({ success: true, message: "Conversation marked as read.", data: result });
  } catch (err) {
    handleMessagingServiceError(err, res, next);
  }
}

// ─── GET /api/conversations/:id/messages/:messageId/attachments/:attachmentId/download

const AttachmentIdSchema = z.string().uuid("Invalid attachment ID.");

function parseRangeHeader(header: string | undefined): { start: number; end?: number } | undefined {
  if (!header) return undefined;
  const m = /^bytes=(\d+)-(\d*)$/i.exec(header.trim());
  if (!m) return undefined;
  const start = Number(m[1]);
  const end = m[2] ? Number(m[2]) : undefined;
  if (!Number.isFinite(start) || start < 0) return undefined;
  if (end !== undefined && (!Number.isFinite(end) || end < start)) return undefined;
  return { start, end };
}

export async function downloadMessageAttachmentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireMessagingAuth(req, res)) return;

    const conversationId = parseConversationId(req, res, ConversationIdSchema);
    if (!conversationId) return;

    const messageIdParsed = MessageIdSchema.safeParse(req.params["messageId"]);
    if (!messageIdParsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(messageIdParsed.error),
      });
      return;
    }
    const attachmentIdParsed = AttachmentIdSchema.safeParse(
      req.params["attachmentId"],
    );
    if (!attachmentIdParsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(attachmentIdParsed.error),
      });
      return;
    }

    const attachmentId = attachmentIdParsed.data;
    const range = parseRangeHeader(req.headers.range);

    const result = await getMessageAttachmentForDownload({
      userId: req.user!.sub,
      conversationId,
      messageId: messageIdParsed.data,
      attachmentId,
      range,
    });

    const status = result.range ? 206 : 200;
    res.status(status);
    res.setHeader("Content-Type", result.contentType || result.attachment.mime_type);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Accept-Ranges", "bytes");

    if (result.range) {
      res.setHeader(
        "Content-Range",
        `bytes ${result.range.start}-${result.range.end}/${result.range.total}`,
      );
      res.setHeader("Content-Length", String(result.range.end - result.range.start + 1));
    } else if (typeof result.contentLength === "number") {
      res.setHeader("Content-Length", String(result.contentLength));
    } else if (typeof result.totalSize === "number") {
      res.setHeader("Content-Length", String(result.totalSize));
    } else if (result.attachment.file_size_bytes) {
      res.setHeader("Content-Length", String(result.attachment.file_size_bytes));
    }

    await pipeline(result.stream, res);
  } catch (err: any) {
    const attachmentId = req.params["attachmentId"];
    const code = err?.code as string | undefined;

    if (code === "NOT_FOUND" || code === "STORAGE_NOT_FOUND") {
      const message =
        code === "STORAGE_NOT_FOUND"
          ? "Attachment file is unavailable."
          : err?.message || "Attachment not found.";
      res.status(404).json({ success: false, error: { message } });
      return;
    }
    if (code === "FORBIDDEN" || code === "INVALID_OPERATION" || code === "INVALID_MEDIA") {
      handleMessagingServiceError(err, res, next);
      return;
    }

    // Log real storage/provider failures with attachment id for diagnosis.
    console.error("[attachments] download failed", {
      attachmentId,
      conversationId: req.params["id"],
      messageId: req.params["messageId"],
      code: err?.code,
      message: err?.message,
      status: err?.status,
    });

    if (code === "STORAGE_ERROR" || err?.http_code || err?.status) {
      res.status(500).json({ success: false, error: { message: "Could not access attachment storage." } });
      return;
    }

    handleMessagingServiceError(err, res, next);
  }
}
