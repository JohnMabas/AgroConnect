export type SupportedLanguageCode = "en" | "ha" | "ig" | "yo" | "pcm";

export interface LanguageDefinition {
  code: SupportedLanguageCode;
  name: string;
  native_name: string;
  reviewed: boolean;
  critical_messages_fall_back_to_english: boolean;
}

export interface LanguagePreferenceData {
  preferred_language: SupportedLanguageCode;
  language_name: string;
  native_name: string;
  reviewed: boolean;
  fallback_language: "en";
}
