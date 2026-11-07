import type { NextFunction, Request, Response } from "express";
import {
  ConversationIdSchema,
  CreateConversationSchema,
  ListConversationsQuerySchema,
  ListMessagesQuerySchema,
  MarkReadSchema,
  SendMessageSchema,
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
  listMessages,
  markConversationRead,
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

    const parsed = SendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: zodErrorToFields(parsed.error),
      });
      return;
    }

    const result = await sendMessage(userId, id, parsed.data);

    emitToConversation(id, result.participant_user_ids, "message:new", {
      message: result.message,
    });
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
