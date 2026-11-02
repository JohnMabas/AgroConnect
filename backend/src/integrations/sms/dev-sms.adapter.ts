// ⚠️  DEVELOPMENT-ONLY SMS ADAPTER
//
// This adapter logs OTP messages to the server console instead of sending
// real SMS messages. It is selected when SMS_PROVIDER=dev (the default).
//
// It must NOT be used in production. Set SMS_PROVIDER to a real provider
// (e.g. "africas-talking") and provide the corresponding credentials.

import type { SmsMessage, SmsProvider } from "./sms-provider.interface.js";

export class DevSmsAdapter implements SmsProvider {
  async sendSms(message: SmsMessage): Promise<void> {
    // In development, print the message to the console so engineers can see
    // the OTP without needing a real phone number or SMS account.
    console.log(
      "[DEV SMS] ─────────────────────────────────────\n" +
        `  To:   ${message.to}\n` +
        `  Body: ${message.body}\n` +
        "[DEV SMS] ─────────────────────────────────────",
    );
    // Simulate a small async delay (network round-trip in production).
    await Promise.resolve();
  }
}
