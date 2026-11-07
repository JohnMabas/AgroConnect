import { z } from "zod";

export const MESSAGE_MAX_LENGTH = 4000;
export const MESSAGE_MIN_LENGTH = 1;

const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

export const ConversationIdSchema = z
  .string()
  .uuid("Invalid conversation ID.");

export const MessageIdSchema = z.string().uuid("Invalid message ID.");

export const CreateConversationSchema = z.object({
  participant_user_id: z
    .string()
    .uuid("participant_user_id must be a valid UUID."),
  listing_id: z
    .string()
    .uuid("listing_id must be a valid UUID.")
    .nullish(),
  buyer_request_id: z
    .string()
    .uuid("buyer_request_id must be a valid UUID.")
    .nullish(),
});

export const ListConversationsQuerySchema = z.object({
  ...paginationFields,
  status: z.enum(["active", "archived", "blocked", "all"]).default("active"),
});

export const SendMessageSchema = z.object({
  content: z
    .string()
    .min(MESSAGE_MIN_LENGTH, "Message content is required.")
    .max(
      MESSAGE_MAX_LENGTH,
      `Message content must be at most ${MESSAGE_MAX_LENGTH} characters.`,
    )
    .refine(
      (value) => value.trim().length > 0,
      "Message content cannot be blank.",
    ),
  message_type: z.literal("text").default("text"),
});

export const ListMessagesQuerySchema = z.object({
  ...paginationFields,
  before: z
    .string()
    .datetime({ offset: true, message: "before must be an ISO 8601 timestamp." })
    .optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const MarkReadSchema = z.object({
  message_id: z
    .string()
    .uuid("message_id must be a valid UUID.")
    .nullish(),
});

export const SocketConversationSchema = z.object({
  conversation_id: ConversationIdSchema,
});

export const SocketSendMessageSchema = z.object({
  conversation_id: ConversationIdSchema,
  content: z
    .string()
    .min(MESSAGE_MIN_LENGTH, "Message content is required.")
    .max(
      MESSAGE_MAX_LENGTH,
      `Message content must be at most ${MESSAGE_MAX_LENGTH} characters.`,
    )
    .refine(
      (value) => value.trim().length > 0,
      "Message content cannot be blank.",
    ),
  message_type: z.literal("text").default("text"),
});

export const SocketMarkReadSchema = z.object({
  conversation_id: ConversationIdSchema,
  message_id: MessageIdSchema.optional(),
});

export const SocketMarkDeliveredSchema = z.object({
  conversation_id: ConversationIdSchema,
  message_id: MessageIdSchema,
});

export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type ListConversationsQuery = z.infer<
  typeof ListConversationsQuerySchema
>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type ListMessagesQuery = z.infer<typeof ListMessagesQuerySchema>;
export type MarkReadInput = z.infer<typeof MarkReadSchema>;
