import { env } from "../../config/env.js";
import { BrevoAdapter } from "./brevo.adapter.js";
import { DevEmailAdapter } from "./dev-email.adapter.js";
import type { EmailProvider } from "./email-provider.interface.js";

let _emailProvider: EmailProvider | undefined;

/**
 * Returns the configured email provider instance (singleton).
 *
 * Provider selection is controlled by EMAIL_PROVIDER:
 *   "dev"    — logs emails to the server console (development only)
 *   "brevo"  — delivers emails via Brevo transactional API
 *   "smtp"   — placeholder for SMTP delivery (not yet implemented)
 *
 * Credentials are validated when the provider is first constructed, not at
 * application startup, so local development without credentials is not blocked.
 */
export function getEmailProvider(): EmailProvider {
  if (_emailProvider === undefined) {
    const provider = env.EMAIL_PROVIDER.toLowerCase();

    switch (provider) {
      case "dev":
        if (env.NODE_ENV === "production") {
          throw new Error(
            "EMAIL_PROVIDER=dev cannot be used in production. " +
              "Set EMAIL_PROVIDER=brevo and supply the credentials.",
          );
        }
        _emailProvider = new DevEmailAdapter();
        break;

      case "brevo":
        if (!env.BREVO_API_KEY) {
          throw new Error(
            "EMAIL_PROVIDER=brevo requires BREVO_API_KEY. " +
              "Obtain it from https://app.brevo.com/settings/keys/api",
          );
        }
        if (!env.BREVO_SENDER_EMAIL) {
          throw new Error(
            "EMAIL_PROVIDER=brevo requires BREVO_SENDER_EMAIL. " +
              "Set it to a sender address verified in your Brevo account.",
          );
        }
        _emailProvider = new BrevoAdapter();
        console.log(
          `[EMAIL] Brevo provider initialised ` +
            `(sender: ${env.BREVO_SENDER_EMAIL}).`,
        );
        break;

      case "smtp":
        // SMTP adapter is not yet implemented.
        // When needed, create SmtpAdapter in smtp.adapter.ts and wire it here.
        throw new Error(
          "EMAIL_PROVIDER=smtp is not yet implemented. " +
            "Use EMAIL_PROVIDER=brevo or EMAIL_PROVIDER=dev.",
        );

      default:
        throw new Error(
          `Unknown EMAIL_PROVIDER: "${env.EMAIL_PROVIDER}". ` +
            "Supported values: dev, brevo.",
        );
    }
  }

  return _emailProvider;
}

/** Exported for testing — allows injecting a mock provider. */
export function setEmailProvider(provider: EmailProvider): void {
  _emailProvider = provider;
}

/**
 * Check Brevo credentials without constructing the provider.
 * Returns a list of missing environment variable names.
 * An empty array means all required keys are present.
 * Credential values are never logged.
 */
export function validateBrevoConfig(): string[] {
  const missing: string[] = [];
  if (!env.BREVO_API_KEY) missing.push("BREVO_API_KEY");
  if (!env.BREVO_SENDER_EMAIL) missing.push("BREVO_SENDER_EMAIL");
  return missing;
}
