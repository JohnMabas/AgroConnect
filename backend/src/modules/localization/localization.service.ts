import { getOrCreateProfile, updateProfile } from "../profiles/profiles.service.js";
import {
  languageDefinitions,
  messageCatalog,
  normalizeLanguage,
  supportedLanguageCodes,
} from "./localization.messages.js";
import type {
  LanguageDefinition,
  LanguagePreferenceData,
  SupportedLanguageCode,
} from "./localization.types.js";

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

export function listLanguages(): LanguageDefinition[] {
  return languageDefinitions();
}

export function isLanguageSupported(language: string): boolean {
  const candidate = language.trim().toLowerCase();
  return supportedLanguageCodes().includes(
    candidate as SupportedLanguageCode,
  );
}

export function assertLanguageSupported(language: string): SupportedLanguageCode {
  const candidate = language.trim().toLowerCase() as SupportedLanguageCode;
  if (!supportedLanguageCodes().includes(candidate)) {
    throw serviceError(
      `Unsupported language. Supported languages: ${supportedLanguageCodes().join(", ")}.`,
      "INVALID_LANGUAGE",
    );
  }
  return candidate;
}

export function buildLanguagePreferenceData(
  language: string | null | undefined,
): LanguagePreferenceData {
  const normalized = normalizeLanguage(language);
  const definition = languageDefinitions().find(
    (item) => item.code === normalized,
  );
  return {
    preferred_language: normalized,
    language_name: definition?.name ?? "English",
    native_name: definition?.native_name ?? "English",
    reviewed: definition?.reviewed ?? true,
    fallback_language: "en",
  };
}

export async function getLanguagePreference(
  userId: string,
): Promise<LanguagePreferenceData> {
  const profile = await getOrCreateProfile(userId);
  return buildLanguagePreferenceData(profile.preferred_language);
}

export async function updateLanguagePreference(
  userId: string,
  language: string,
): Promise<LanguagePreferenceData> {
  const normalized = assertLanguageSupported(language);
  const profile = await updateProfile(userId, {
    preferred_language: normalized,
  });
  return buildLanguagePreferenceData(profile.preferred_language);
}

export function getLocalizedMessages(language: string | null | undefined): {
  language: SupportedLanguageCode;
  messages: Record<string, string>;
} {
  return messageCatalog(language);
}
