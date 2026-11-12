import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

export const UssdCallbackSchema = z.object({
  sessionId: z.string().trim().min(1, "sessionId is required.").max(200),
  phoneNumber: z.string().trim().min(1, "phoneNumber is required.").max(32),
  networkCode: optionalString,
  serviceCode: optionalString,
  text: z
    .string()
    .optional()
    .transform((value) => value ?? ""),
});

export type UssdCallbackInput = z.infer<typeof UssdCallbackSchema>;

const booleanish = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }
  return false;
}, z.boolean());

export const VoiceCallbackSchema = z
  .object({
    sessionId: z.string().trim().min(1, "sessionId is required.").max(200),
    callerNumber: z.string().trim().min(1, "callerNumber is required.").max(32),
    destinationNumber: optionalString,
    direction: optionalString,
    isActive: booleanish,
    // Africa's Talking sends keypad input as `dtmfDigits`. `digits` is kept as
    // a backwards-compatible alias for internal callers and older sandboxes.
    dtmfDigits: z.string().max(200).optional(),
    digits: z.string().max(200).optional(),
  })
  .transform((value) => ({
    sessionId: value.sessionId,
    callerNumber: value.callerNumber,
    destinationNumber: value.destinationNumber,
    direction: value.direction,
    isActive: value.isActive,
    digits: value.dtmfDigits ?? value.digits ?? "",
  }));

export type VoiceCallbackInput = z.infer<typeof VoiceCallbackSchema>;

const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);

export const TelecomSessionQuerySchema = z.object({
  page,
  limit,
  status: z.enum(["active", "completed", "expired", "failed"]).optional(),
  channel: z.enum(["ussd", "voice"]).optional(),
  phone_number: z.string().trim().max(32).optional(),
});

export const TelecomSupportQuerySchema = z.object({
  page,
  limit,
  status: z.enum(["open", "acknowledged", "resolved", "closed"]).optional(),
  channel: z.enum(["ussd", "voice"]).optional(),
});

export const TelecomSupportUpdateSchema = z.object({
  status: z.enum(["open", "acknowledged", "resolved", "closed"]),
});

export const TelecomWebhookQuerySchema = z.object({
  page,
  limit,
  channel: z.enum(["ussd", "voice"]).optional(),
  status: z
    .enum(["received", "processed", "duplicate", "rejected", "failed"])
    .optional(),
});

export const TelecomSessionIdSchema = z.string().uuid("Invalid session ID.");
