// ⚠️  DEVELOPMENT-ONLY EMAIL ADAPTER
//
// This adapter logs email content to the server console instead of sending
// real emails. It is selected when EMAIL_PROVIDER=dev (the default).
//
// It must NOT be used in production. Configure an SMTP server or a transactional
// email service (e.g. SendGrid, Mailgun, AWS SES) and set EMAIL_PROVIDER accordingly.

import type { EmailMessage, EmailProvider } from "./email-provider.interface.js";

export class DevEmailAdapter implements EmailProvider {
  async sendEmail(message: EmailMessage): Promise<void> {
    console.log(
      "[DEV EMAIL] ────────────────────────────────────\n" +
        `  To:      ${message.to}\n` +
        `  Subject: ${message.subject}\n` +
        `  Body:\n${message.text}\n` +
        "[DEV EMAIL] ────────────────────────────────────",
    );
    await Promise.resolve();
  }
}
