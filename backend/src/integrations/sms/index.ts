import { env } from "../../config/env.js";
import { AfricasTalkingAdapter } from "./africastalking.adapter.js";
import { DevSmsAdapter } from "./dev-sms.adapter.js";
import type { SmsProvider } from "./sms-provider.interface.js";

let _smsProvider: SmsProvider | undefined;

/**
 * Returns the configured SMS provider instance (singleton).
 *
 * Provider selection is controlled by SMS_PROVIDER:
 *   "dev"              — logs OTPs to the server console (development only)
 *   "africastalking"   — delivers SMS via Africa's Talking
 *
 * Credentials are validated when the provider is first constructed, not at
 * application startup, so local development without credentials is not blocked.
 */
export function getSmsProvider(): SmsProvider {
  if (_smsProvider === undefined) {
    const provider = env.SMS_PROVIDER.toLowerCase();

    switch (provider) {
      case "dev":
        if (env.NODE_ENV === "production") {
          throw new Error(
            "SMS_PROVIDER=dev cannot be used in production. " +
              "Set SMS_PROVIDER=africastalking and supply the credentials.",
          );
        }
        _smsProvider = new DevSmsAdapter();
        break;

      case "africastalking":
        if (!env.AFRICASTALKING_USERNAME) {
          throw new Error(
            "SMS_PROVIDER=africastalking requires AFRICASTALKING_USERNAME. " +
              "Use 'sandbox' for testing or your live username for production.",
          );
        }
        if (!env.AFRICASTALKING_API_KEY) {
          throw new Error(
            "SMS_PROVIDER=africastalking requires AFRICASTALKING_API_KEY. " +
              "Obtain it from https://account.africastalking.com/",
          );
        }
        _smsProvider = new AfricasTalkingAdapter();
        console.log(
          `[SMS] Africa's Talking provider initialised ` +
            `(username: ${env.AFRICASTALKING_USERNAME}).`,
        );
        break;

      default:
        throw new Error(
          `Unknown SMS_PROVIDER: "${env.SMS_PROVIDER}". ` +
            "Supported values: dev, africastalking.",
        );
    }
  }

  return _smsProvider;
}

/** Exported for testing — allows injecting a mock provider. */
export function setSmsProvider(provider: SmsProvider): void {
  _smsProvider = provider;
}

/**
 * Check Africa's Talking credentials without constructing the provider.
 * Returns a list of missing environment variable names.
 * An empty array means all required keys are present.
 * Credential values are never logged.
 */
export function validateAfricasTalkingConfig(): string[] {
  const missing: string[] = [];
  if (!env.AFRICASTALKING_USERNAME) missing.push("AFRICASTALKING_USERNAME");
  if (!env.AFRICASTALKING_API_KEY) missing.push("AFRICASTALKING_API_KEY");
  return missing;
}
