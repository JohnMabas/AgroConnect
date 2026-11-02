import { env } from "../../config/env.js";
import { DevEmailAdapter } from "./dev-email.adapter.js";
import type { EmailProvider } from "./email-provider.interface.js";

let _emailProvider: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  if (_emailProvider === undefined) {
    const provider = env.EMAIL_PROVIDER.toLowerCase();

    switch (provider) {
      case "dev":
        if (env.NODE_ENV === "production") {
          throw new Error(
            "EMAIL_PROVIDER=dev cannot be used in production. Configure a real email provider.",
          );
        }
        _emailProvider = new DevEmailAdapter();
        break;

      // Future providers:
      // case "smtp":
      //   _emailProvider = new SmtpEmailAdapter({
      //     host: env.EMAIL_HOST!, port: env.EMAIL_PORT,
      //     user: env.EMAIL_USER!, password: env.EMAIL_PASSWORD!,
      //     from: env.EMAIL_FROM,
      //   });
      //   break;

      default:
        throw new Error(
          `Unknown EMAIL_PROVIDER: "${env.EMAIL_PROVIDER}". Supported values: dev.`,
        );
    }
  }

  return _emailProvider;
}

// Exported for testing — allows injecting a mock provider.
export function setEmailProvider(provider: EmailProvider): void {
  _emailProvider = provider;
}
