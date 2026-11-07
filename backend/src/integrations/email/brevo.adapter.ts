// Brevo transactional email adapter.
// Delivers real emails via the Brevo (formerly Sendinblue) API.
// Selected when EMAIL_PROVIDER=brevo.
//
// Setup:
//   1. Obtain an API key from https://app.brevo.com/settings/keys/api
//   2. Add a verified sender address in Brevo → Senders & IP → Senders
//   3. Set BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME in .env

import { BrevoClient } from "@getbrevo/brevo";
import { env } from "../../config/env.js";
import type { EmailMessage, EmailProvider } from "./email-provider.interface.js";

export class BrevoAdapter implements EmailProvider {
  private readonly client: BrevoClient;

  constructor() {
    // Credentials are validated by the factory before this constructor runs.
    // The API key is passed as a header; it is never logged.
    this.client = new BrevoClient({
      apiKey: env.BREVO_API_KEY!,
    });
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: {
          email: env.BREVO_SENDER_EMAIL!,
          name: env.BREVO_SENDER_NAME,
        },
        to: [{ email: message.to }],
        subject: message.subject,
        // Prefer HTML content when provided; always include a plain-text version.
        htmlContent: message.html ?? `<pre>${message.text}</pre>`,
        textContent: message.text,
      });
    } catch (err) {
      // Never log the message body — it may contain verification tokens.
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Brevo email delivery failed for ${message.to}: ${errMsg}`,
        { cause: err },
      );
    }

    // Log only the non-sensitive delivery confirmation.
    console.log(
      `[EMAIL] Sent "${message.subject}" to ${message.to} via Brevo.`,
    );
  }
}
