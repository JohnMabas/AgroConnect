import { env } from "../../config/env.js";
import { AIConfiguration } from "../../database/models/index.js";
import type {
  AIConfigurationData,
  AIFeatureFlags,
} from "./ai.types.js";
import { getAIProvider } from "./ai.provider.js";
import type { UpdateAIConfigurationInput } from "./ai.validation.js";

const CONFIG_ID = "global";

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

async function getOrCreateConfiguration(): Promise<AIConfiguration> {
  const existing = await AIConfiguration.findByPk(CONFIG_ID);
  if (existing) return existing;

  const [configuration] = await AIConfiguration.findOrCreate({
    where: { id: CONFIG_ID },
    defaults: {
      id: CONFIG_ID,
      assistant_enabled: env.AI_ASSISTANT_ENABLED,
      recommendations_enabled: env.AI_RECOMMENDATIONS_ENABLED,
      integrity_enabled: env.AI_INTEGRITY_ENABLED,
      updated_by_user_id: null,
    },
  });
  return configuration;
}

export async function getAIFeatureFlags(): Promise<AIFeatureFlags> {
  const configuration = await getOrCreateConfiguration();
  return {
    assistant_enabled:
      configuration.assistant_enabled && env.AI_ASSISTANT_ENABLED,
    recommendations_enabled:
      configuration.recommendations_enabled && env.AI_RECOMMENDATIONS_ENABLED,
    integrity_enabled:
      configuration.integrity_enabled && env.AI_INTEGRITY_ENABLED,
  };
}

export async function requireAIFeature(
  feature: keyof AIFeatureFlags,
): Promise<void> {
  const flags = await getAIFeatureFlags();
  if (!flags[feature]) {
    throw serviceError(
      "This AI feature is currently disabled.",
      "FEATURE_DISABLED",
    );
  }
}

export async function getAIConfigurationData(): Promise<AIConfigurationData> {
  const configuration = await getOrCreateConfiguration();
  const provider = getAIProvider();
  return {
    assistant_enabled: configuration.assistant_enabled,
    recommendations_enabled: configuration.recommendations_enabled,
    integrity_enabled: configuration.integrity_enabled,
    provider: provider.name,
    model: provider.model,
    provider_configured: provider.configured,
    updated_by_user_id: configuration.updated_by_user_id ?? null,
    updated_at: configuration.updated_at ?? null,
  };
}

export async function updateAIConfiguration(
  adminUserId: string,
  input: UpdateAIConfigurationInput,
): Promise<AIConfigurationData> {
  const configuration = await getOrCreateConfiguration();
  await configuration.update({
    ...(input.assistant_enabled !== undefined
      ? { assistant_enabled: input.assistant_enabled }
      : {}),
    ...(input.recommendations_enabled !== undefined
      ? { recommendations_enabled: input.recommendations_enabled }
      : {}),
    ...(input.integrity_enabled !== undefined
      ? { integrity_enabled: input.integrity_enabled }
      : {}),
    updated_by_user_id: adminUserId,
  });
  return getAIConfigurationData();
}
