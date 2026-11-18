import { z } from "zod";

const uuid = z.string().uuid();

export const CallTypeSchema = z.enum(["audio", "video"]);

export const CreateCallSchema = z.object({
  conversation_id: uuid,
  callee_user_id: uuid,
  call_type: CallTypeSchema,
});

export const CallIdParamSchema = z.object({
  id: uuid,
});

export const ListCallsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z
    .enum([
      "ringing",
      "accepted",
      "rejected",
      "ended",
      "missed",
      "cancelled",
      "failed",
    ])
    .optional(),
  conversation_id: uuid.optional(),
});

export const CallActionBodySchema = z.object({
  reason: z.string().max(100).optional().nullable(),
});

export const SocketCallInviteSchema = z.object({
  conversation_id: uuid,
  callee_user_id: uuid,
  call_type: CallTypeSchema,
});

export const SocketCallActionSchema = z.object({
  call_id: uuid,
  reason: z.string().max(100).optional(),
});

export const SocketCallSdpSchema = z.object({
  call_id: uuid,
  sdp: z.unknown(),
});

export const SocketCallIceSchema = z.object({
  call_id: uuid,
  candidate: z.unknown(),
});

export type CreateCallInput = z.infer<typeof CreateCallSchema>;
export type ListCallsQuery = z.infer<typeof ListCallsQuerySchema>;
