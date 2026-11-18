import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { createFixedWindowLimiter } from "./messaging.rate-limit.js";
import {
  archiveConversationHandler,
  blockConversationHandler,
  createConversationHandler,
  downloadMessageAttachmentHandler,
  getConversationHandler,
  listConversationsHandler,
  listMessagesHandler,
  markConversationReadHandler,
  sendMessageHandler,
  unarchiveConversationHandler,
  unblockConversationHandler,
} from "./conversations.controller.js";
import { uploadMessageAttachments } from "./message-attachments.upload.middleware.js";

const conversationCreateLimiter = createFixedWindowLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  message: "Too many conversation requests. Please try again later.",
});

const messageSendLimiter = createFixedWindowLimiter({
  windowMs: 60 * 1000,
  limit: 60,
  message: "Too many messages. Please slow down and try again shortly.",
});

const readLimiter = createFixedWindowLimiter({
  windowMs: 60 * 1000,
  limit: 120,
  message: "Too many read acknowledgement requests. Please try again shortly.",
});

export function createConversationsRouter(): Router {
  const router = Router();

  router.use(authenticate);

  // Conversation collection
  router.post("/", conversationCreateLimiter, createConversationHandler);
  router.get("/", listConversationsHandler);

  // Conversation messages
  router.post(
    "/:id/messages",
    messageSendLimiter,
    uploadMessageAttachments,
    sendMessageHandler,
  );
  router.get("/:id/messages", listMessagesHandler);
  router.get(
    "/:id/messages/:messageId/attachments/:attachmentId/download",
    downloadMessageAttachmentHandler,
  );

  // Read receipts
  router.patch("/:id/read", readLimiter, markConversationReadHandler);

  // Conversation status transitions
  router.patch("/:id/archive", archiveConversationHandler);
  router.patch("/:id/unarchive", unarchiveConversationHandler);
  router.patch("/:id/block", blockConversationHandler);
  router.patch("/:id/unblock", unblockConversationHandler);

  // Single conversation
  router.get("/:id", getConversationHandler);

  return router;
}
