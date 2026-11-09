import { env } from "../../config/env.js";
import { sanitizePlainText } from "../../utils/plain-text.js";

const PROMPT_INJECTION_PATTERNS: Array<[string, RegExp]> = [
  ["instruction_override", /\b(ignore|disregard|forget)\b.{0,40}\b(previous|prior|above|system)\b.{0,20}\b(instructions?|messages?|prompt)\b/i],
  ["system_prompt_request", /\b(system|developer)\s+(prompt|message|instructions?)\b/i],
  ["role_override", /\b(you are now|act as|pretend to be)\b.{0,60}\b(system|admin|developer|unrestricted)\b/i],
  ["jailbreak", /\b(jailbreak|developer mode|do anything now|dan mode)\b/i],
  ["tool_execution", /\b(execute|run|call)\b.{0,30}\b(sql|shell|command|tool|function|code)\b/i],
  ["delimiter_injection", /<\|(im_start|im_end|system|assistant)\|>|```system/i],
];

const SECRET_REQUEST_PATTERNS: Array<[string, RegExp]> = [
  ["api_key_request", /\b(api[_ -]?key|access[_ -]?token|secret[_ -]?key|jwt[_ -]?secret)\b/i],
  ["credential_request", /\b(password|passcode|credentials?|private key)\b/i],
  ["configuration_request", /\b(environment variables?|\.env|server configuration)\b/i],
  ["personal_data_request", /\b(other users?|someone else's|phone numbers?|email addresses?)\b.{0,40}\b(show|list|reveal|give)\b/i],
];

export function detectPromptInjection(value: string): string[] {
  return PROMPT_INJECTION_PATTERNS.filter(([, pattern]) => pattern.test(value)).map(
    ([flag]) => flag,
  );
}

export function detectSecretRequests(value: string): string[] {
  return SECRET_REQUEST_PATTERNS.filter(([, pattern]) => pattern.test(value)).map(
    ([flag]) => flag,
  );
}

export function detectKnowledgeSafetyFlags(value: string): string[] {
  return [...new Set([...detectPromptInjection(value), ...detectSecretRequests(value)])];
}

export function sanitizeUserInput(value: string): string {
  return sanitizePlainText(value).slice(0, env.AI_MAX_INPUT_LENGTH);
}

export function sanitizeAssistantOutput(value: string): string {
  let cleaned = sanitizePlainText(value);
  const secret = env.AI_API_KEY;
  if (secret && secret.length >= 8) {
    cleaned = cleaned.split(secret).join("[REDACTED]");
  }
  cleaned = cleaned.replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[REDACTED]");
  cleaned = cleaned.replace(
    /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi,
    "Bearer [REDACTED]",
  );
  return cleaned.slice(0, Math.max(1_000, env.AI_MAX_OUTPUT_TOKENS * 5));
}

export function hasUnsafeAgriculturalDosage(value: string): boolean {
  return /\b(?:pesticide|herbicide|insecticide|fungicide|fertili[sz]er)\b.{0,120}\b\d+(?:\.\d+)?\s*(?:ml|g|kg|l|lit(?:re|er)s?)\b/i.test(value);
}

export function sanitizeKnowledgeText(value: string): string {
  return sanitizePlainText(value);
}
