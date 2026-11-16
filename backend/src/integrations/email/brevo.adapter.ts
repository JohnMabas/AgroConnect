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
import type {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from "./email-provider.interface.js";

export class BrevoAdapter implements EmailProvider {
  private readonly client: BrevoClient;

  constructor() {
    // Credentials are validated by the factory before this constructor runs.
    // The API key is passed as a header; it is never logged.
    this.client = new BrevoClient({
      apiKey: env.BREVO_API_KEY!,
    });
  }

  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    let response: unknown;
    try {
      response = await this.client.transactionalEmails.sendTransacEmail({
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
      // Never include the message body or provider response in the error.
      // Either may contain the verification code. Only a non-sensitive status
      // code is retained for diagnostics.
      const status = (err as { status?: unknown }).status;
      const statusSuffix =
        typeof status === "number" ? ` (status ${status})` : "";
      throw Object.assign(
        new Error(
          `Brevo email delivery failed for ${message.to}${statusSuffix}.`,
        ),
        { code: "EMAIL_DELIVERY_FAILED" },
      );
    }

    // Log only the non-sensitive delivery confirmation.
    console.log(
      `[EMAIL] Sent "${message.subject}" to ${message.to} via Brevo.`,
    );

    const result = response as {
      messageId?: string | number;
      messageIds?: Array<string | number>;
    };
    const reference =
      result.messageId ?? result.messageIds?.[0] ?? null;
    return {
      provider_reference: reference === null ? null : String(reference),
    };
  }
}
