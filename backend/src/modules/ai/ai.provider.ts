import { env } from "../../config/env.js";

export type AIMessageRole = "system" | "user" | "assistant";

export interface AIMessage {
  role: AIMessageRole;
  content: string;
}

export interface AIGenerationInput {
  messages: AIMessage[];
  max_tokens?: number;
  temperature?: number;
}

export interface AIGenerationOutput {
  text: string;
  provider: string;
  model: string;
  request_tokens: number;
  response_tokens: number;
  total_tokens: number;
  latency_ms: number;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export interface AIProvider {
  readonly name: string;
  readonly model: string | null;
  readonly configured: boolean;
  generate(input: AIGenerationInput): Promise<AIGenerationOutput>;
}

class UnconfiguredAIProvider implements AIProvider {
  readonly name = env.AI_PROVIDER;
  readonly model = env.AI_MODEL ?? null;
  readonly configured = false;

  async generate(): Promise<AIGenerationOutput> {
    throw new AIProviderError(
      "No external AI provider is configured.",
      "AI_NOT_CONFIGURED",
    );
  }
}

interface OpenAICompatibleResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    total_tokens?: unknown;
  };
}

function safeInteger(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

class OpenAICompatibleProvider implements AIProvider {
  readonly name = "openai_compatible";
  readonly model = env.AI_MODEL ?? null;
  readonly configured = true;

  async generate(input: AIGenerationInput): Promise<AIGenerationOutput> {
    if (!env.AI_API_KEY || !env.AI_MODEL) {
      throw new AIProviderError(
        "AI provider credentials are incomplete.",
        "AI_NOT_CONFIGURED",
      );
    }

    const startedAt = Date.now();
    const url = `${env.AI_BASE_URL.replace(/\/+$/, "")}/chat/completions`;
    let response: Response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.AI_MODEL,
          messages: input.messages,
          max_tokens: input.max_tokens ?? env.AI_MAX_OUTPUT_TOKENS,
          temperature: input.temperature ?? 0.2,
        }),
        signal: AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const name =
        error instanceof Error && error.name === "TimeoutError"
          ? "AI_TIMEOUT"
          : "AI_REQUEST_FAILED";
      throw new AIProviderError("The AI provider request failed.", name);
    }

    if (!response.ok) {
      throw new AIProviderError(
        "The AI provider returned an unsuccessful response.",
        "AI_PROVIDER_ERROR",
      );
    }

    let payload: OpenAICompatibleResponse;
    try {
      payload = (await response.json()) as OpenAICompatibleResponse;
    } catch {
      throw new AIProviderError(
        "The AI provider returned invalid JSON.",
        "AI_INVALID_RESPONSE",
      );
    }

    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new AIProviderError(
        "The AI provider returned an empty response.",
        "AI_EMPTY_RESPONSE",
      );
    }

    const requestTokens = safeInteger(payload.usage?.prompt_tokens);
    const responseTokens = safeInteger(payload.usage?.completion_tokens);
    const totalTokens =
      safeInteger(payload.usage?.total_tokens) ||
      requestTokens + responseTokens;

    return {
      text: content.trim(),
      provider: this.name,
      model: env.AI_MODEL,
      request_tokens: requestTokens,
      response_tokens: responseTokens,
      total_tokens: totalTokens,
      latency_ms: Date.now() - startedAt,
    };
  }
}

let provider: AIProvider | undefined;

export function getAIProvider(): AIProvider {
  if (!provider) {
    provider =
      env.AI_PROVIDER === "openai_compatible"
        ? new OpenAICompatibleProvider()
        : new UnconfiguredAIProvider();
  }
  return provider;
}

export function setAIProviderForTests(next: AIProvider | undefined): void {
  provider = next;
}
