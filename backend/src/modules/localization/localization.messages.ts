import { env } from "../../config/env.js";
import type {
  LanguageDefinition,
  SupportedLanguageCode,
} from "./localization.types.js";

const ENGLISH_MESSAGES: Record<string, string> = {
  "common.back": "0. Back",
  "common.exit": "0. Exit",
  "common.cancel": "0. Cancel",
  "common.invalid_option": "Invalid option. Please try again.",
  "common.not_registered":
    "This phone number is not registered. Choose 1 to register.",
  "common.service_unavailable":
    "Service temporarily unavailable. Please try again later.",
  "common.session_expired": "Session expired. Please dial again.",
  "common.yes_no": "1. Yes\n2. No",
  "menu.title": "AgroConnect",
  "menu.farmer": "Farmer menu",
  "menu.buyer": "Buyer menu",
  "menu.guest": "Welcome to AgroConnect",
  "menu.pending": "Account verification",
  "menu.option.sell": "1. Sell produce",
  "menu.option.my_listings": "2. My listings",
  "menu.option.buyer_requests": "3. Buyer requests",
  "menu.option.create_request": "2. Create buyer request",
  "menu.option.my_requests": "3. My buyer requests",
  "menu.option.offers": "4. Offers",
  "menu.option.orders": "5. Orders",
  "menu.option.market": "6. Market prices",
  "menu.option.language": "7. Language",
  "menu.option.support": "8. Support",
  "menu.option.register": "1. Register",
  "menu.option.browse": "1. Browse produce",
  "menu.option.verify": "1. Enter OTP",
  "menu.option.resend_otp": "2. Resend OTP",
  "menu.option.exit": "0. Exit",
  "language.prompt": "Select language:",
  "language.saved": "Language saved.",
  "register.name_prompt": "Enter your full name:",
  "register.otp_prompt": "Enter the 6-digit OTP sent by SMS:",
  "register.complete":
    "Registration received. Your phone is verified. You can now use AgroConnect.",
  "register.exists":
    "An account already exists for this phone. Please dial again and use the menu.",
  "register.failed": "Registration failed. Please try again later.",
  "register.otp_invalid": "Invalid or expired OTP. Please try again.",
  "pending.verify": "Your account needs phone verification.",
  "pending.resent": "A new OTP has been sent by SMS.",
  "listing.select_type": "Select produce:",
  "listing.quantity": "Enter quantity in numbers:",
  "listing.unit": "Select unit:\n1. kg\n2. bag\n3. tonne\n4. bunch",
  "listing.price": "Enter price per unit in Naira:",
  "listing.location": "Enter your location (town or LGA):",
  "listing.location_label": "Location",
  "listing.confirm": "Confirm listing:\n1. Publish\n2. Cancel",
  "listing.published": "Listing published. Buyers can now find your produce.",
  "listing.failed": "Could not publish listing. Please try again.",
  "my_listings.empty": "You have no listings yet.",
  "my_listings.header": "Your listings:",
  "buyer_requests.empty": "No open buyer requests right now.",
  "buyer_requests.header": "Open buyer requests:",
  "my_requests.empty": "You have no open buyer requests.",
  "my_requests.header": "Your buyer requests:",
  "offers.empty": "You have no pending offers.",
  "offers.header": "Pending offers received:",
  "offers.action": "Select offer:",
  "offers.confirm_accept":
    "Accepting this offer is final. Press 1 to confirm, 2 to go back.",
  "offers.accepted": "Offer accepted. An order will be created.",
  "offers.rejected": "Offer rejected.",
  "offers.failed": "Could not update offer. Please try again.",
  "orders.empty": "You have no orders yet.",
  "orders.header": "Your orders:",
  "market.select_type": "Select produce for market price:",
  "market.empty": "No market prices available for this produce yet.",
  "market.result": "{name} price: average {average} per {unit}.",
  "support.prompt": "Describe your issue briefly:",
  "support.received": "Support request received. Our team will contact you.",
  "support.failed": "Could not submit support request. Please try again.",
  "browse.empty": "No produce listings available for this produce yet.",
  "browse.header": "Available produce:",
  "voice.welcome": "Welcome to AgroConnect.",
  "voice.no_input": "We did not receive your input.",
  "voice.invalid": "That option is not available.",
  "voice.support_callback":
    "A support request has been recorded. Our team will call you back.",
};

const TRANSLATIONS: Partial<
  Record<SupportedLanguageCode, Record<string, string>>
> = {
  ha: {
    "common.back": "0. Baya",
    "common.exit": "0. Fita",
    "common.cancel": "0. Soke",
    "common.invalid_option": "Zaɓi ba daidai ba. Sake gwadawa.",
    "menu.title": "AgroConnect",
    "menu.farmer": "Menu na manomi",
    "menu.buyer": "Menu na mai siye",
    "menu.guest": "Barka da zuwa AgroConnect",
    "menu.pending": "Tabbatar da asusu",
    "menu.option.sell": "1. Sayar da amfanin gona",
    "menu.option.my_listings": "2. Kayana",
    "menu.option.buyer_requests": "3. Bukatun masu siye",
    "menu.option.create_request": "2. Ƙirƙiri buƙata",
    "menu.option.my_requests": "3. Bukatuna",
    "menu.option.offers": "4. Tayi",
    "menu.option.orders": "5. Oda",
    "menu.option.market": "6. Farashin kasuwa",
    "menu.option.language": "7. Harshe",
    "menu.option.support": "8. Taimako",
    "menu.option.register": "1. Yi rijista",
    "menu.option.browse": "1. Duba amfanin gona",
    "menu.option.verify": "1. Shigar da OTP",
    "menu.option.resend_otp": "2. Sake aika OTP",
    "menu.option.exit": "0. Fita",
    "language.prompt": "Zaɓi harshe:",
    "language.saved": "An adana harshe.",
  },
  ig: {
    "common.back": "0. Laghachi",
    "common.exit": "0. Pụọ",
    "common.cancel": "0. Kagbuo",
    "common.invalid_option": "Nhọrọ adịghị mma. Biko nwaa ọzọ.",
    "menu.title": "AgroConnect",
    "menu.farmer": "Menu onye ọrụ ugbo",
    "menu.buyer": "Menu onye na-azụ ihe",
    "menu.guest": "Nnọọ na AgroConnect",
    "menu.pending": "Nkwenye akaụntụ",
    "menu.option.sell": "1. Ree ihe ubi",
    "menu.option.my_listings": "2. Ihe m na-ere",
    "menu.option.buyer_requests": "3. Arịrịọ ndị na-azụ ihe",
    "menu.option.create_request": "2. Mepụta arịrịọ",
    "menu.option.my_requests": "3. Arịrịọ m",
    "menu.option.offers": "4. Onyinye",
    "menu.option.orders": "5. Iwu",
    "menu.option.market": "6. Ọnụ ahịa ahịa",
    "menu.option.language": "7. Asụsụ",
    "menu.option.support": "8. Nkwado",
    "menu.option.register": "1. Debanye aha",
    "menu.option.browse": "1. Lelee ihe ubi",
    "menu.option.verify": "1. Tinye OTP",
    "menu.option.resend_otp": "2. Zipu OTP ọzọ",
    "menu.option.exit": "0. Pụọ",
    "language.prompt": "Họrọ asụsụ:",
    "language.saved": "Echekwara asụsụ.",
  },
  yo: {
    "common.back": "0. Pada",
    "common.exit": "0. Jade",
    "common.cancel": "0. Fagilee",
    "common.invalid_option": "Aṣayan ko tọ. Jọwọ gbiyanju lẹẹkansi.",
    "menu.title": "AgroConnect",
    "menu.farmer": "Akojọ àgbẹ̀",
    "menu.buyer": "Akojọ olùrà",
    "menu.guest": "Kaabọ si AgroConnect",
    "menu.pending": "Ìjẹ́rìí àkọsílẹ̀",
    "menu.option.sell": "1. Ta ọjà oko",
    "menu.option.my_listings": "2. Ọjà mi",
    "menu.option.buyer_requests": "3. Ìbéèrè olùrà",
    "menu.option.create_request": "2. Ṣíṣe ìbéèrè",
    "menu.option.my_requests": "3. Ìbéèrè mi",
    "menu.option.offers": "4. Ìdáná",
    "menu.option.orders": "5. Àwọn àṣẹ",
    "menu.option.market": "6. Iye ọjà",
    "menu.option.language": "7. Èdè",
    "menu.option.support": "8. Ìtìlẹ́yìn",
    "menu.option.register": "1. Forúkọsílẹ̀",
    "menu.option.browse": "1. Wo ọjà oko",
    "menu.option.verify": "1. Tẹ OTP",
    "menu.option.resend_otp": "2. Fi OTP ránṣẹ́ lẹ́ẹ̀kan sí",
    "menu.option.exit": "0. Jade",
    "language.prompt": "Yan èdè:",
    "language.saved": "A ti fi èdè pamọ́.",
  },
  pcm: {
    "common.back": "0. Go back",
    "common.exit": "0. Comot",
    "common.cancel": "0. Cancel",
    "common.invalid_option": "Dat option no correct. Abeg try again.",
    "menu.title": "AgroConnect",
    "menu.farmer": "Farmer menu",
    "menu.buyer": "Buyer menu",
    "menu.guest": "Welcome to AgroConnect",
    "menu.pending": "Account verification",
    "menu.option.sell": "1. Sell produce",
    "menu.option.my_listings": "2. My listings",
    "menu.option.buyer_requests": "3. Buyer requests",
    "menu.option.create_request": "2. Create buyer request",
    "menu.option.my_requests": "3. My buyer requests",
    "menu.option.offers": "4. Offers",
    "menu.option.orders": "5. Orders",
    "menu.option.market": "6. Market prices",
    "menu.option.language": "7. Language",
    "menu.option.support": "8. Support",
    "menu.option.register": "1. Register",
    "menu.option.browse": "1. Browse produce",
    "menu.option.verify": "1. Enter OTP",
    "menu.option.resend_otp": "2. Resend OTP",
    "menu.option.exit": "0. Comot",
    "language.prompt": "Pick language:",
    "language.saved": "Language don save.",
  },
};

const LANGUAGE_LABELS: Record<
  SupportedLanguageCode,
  Pick<LanguageDefinition, "name" | "native_name">
> = {
  en: { name: "English", native_name: "English" },
  ha: { name: "Hausa", native_name: "Hausa" },
  ig: { name: "Igbo", native_name: "Igbo" },
  yo: { name: "Yoruba", native_name: "Yorùbá" },
  pcm: { name: "Nigerian Pidgin", native_name: "Naija Pidgin" },
};

const CRITICAL_KEYS = new Set([
  "register.complete",
  "register.otp_invalid",
  "listing.published",
  "listing.failed",
  "offers.confirm_accept",
  "offers.accepted",
  "offers.rejected",
  "offers.failed",
  "support.received",
  "support.failed",
  "voice.support_callback",
]);

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function isSupportedCode(value: string): value is SupportedLanguageCode {
  return Object.prototype.hasOwnProperty.call(LANGUAGE_LABELS, value);
}

export function supportedLanguageCodes(): SupportedLanguageCode[] {
  const configured = parseCsv(env.LOCALIZATION_SUPPORTED_LANGUAGES);
  const codes = configured.filter(isSupportedCode);
  const unique = [...new Set(codes)];
  return unique.length > 0 ? unique : ["en"];
}

export function reviewedLanguageCodes(): Set<SupportedLanguageCode> {
  return new Set(
    parseCsv(env.LOCALIZATION_REVIEWED_LANGUAGES).filter(isSupportedCode),
  );
}

export function languageDefinitions(): LanguageDefinition[] {
  const reviewed = reviewedLanguageCodes();
  return supportedLanguageCodes().map((code) => ({
    code,
    ...LANGUAGE_LABELS[code],
    reviewed: reviewed.has(code),
    critical_messages_fall_back_to_english: !reviewed.has(code),
  }));
}

export function normalizeLanguage(
  value: string | null | undefined,
  fallback: string = env.LOCALIZATION_DEFAULT_LANGUAGE,
): SupportedLanguageCode {
  const candidate = value?.trim().toLowerCase();
  const supported = supportedLanguageCodes();
  if (candidate && isSupportedCode(candidate) && supported.includes(candidate)) {
    return candidate;
  }
  if (isSupportedCode(fallback) && supported.includes(fallback)) {
    return fallback;
  }
  return "en";
}

function interpolate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function translate(
  key: string,
  language: string | null | undefined,
  variables: Record<string, unknown> = {},
  options: { critical?: boolean } = {},
): string {
  const code = normalizeLanguage(language);
  const isCritical = options.critical === true || CRITICAL_KEYS.has(key);
  const reviewed = reviewedLanguageCodes();

  if (isCritical && code !== "en" && !reviewed.has(code)) {
    return interpolate(ENGLISH_MESSAGES[key] ?? key, variables);
  }

  const translated = TRANSLATIONS[code]?.[key];
  const template = translated ?? ENGLISH_MESSAGES[key] ?? key;
  return interpolate(template, variables);
}

export function messageCatalog(language: string | null | undefined): {
  language: SupportedLanguageCode;
  messages: Record<string, string>;
} {
  const code = normalizeLanguage(language);
  const reviewed = reviewedLanguageCodes();
  const messages: Record<string, string> = { ...ENGLISH_MESSAGES };
  const translated = TRANSLATIONS[code];

  if (translated) {
    for (const [key, value] of Object.entries(translated)) {
      if (CRITICAL_KEYS.has(key) && !reviewed.has(code)) {
        continue;
      }
      messages[key] = value;
    }
  }

  return { language: code, messages };
}
