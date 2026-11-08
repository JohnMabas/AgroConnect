// Africa's Talking SMS adapter.
// Delivers real SMS via the Africa's Talking API.
// Selected when SMS_PROVIDER=africastalking.
//
// Sandbox testing:
//   Set AFRICASTALKING_USERNAME=sandbox and use the sandbox API key.
//   Messages are not delivered to real phones in sandbox mode.
//
// Production:
//   Set AFRICASTALKING_USERNAME to your live username and supply the live API key.
//   Register a Sender ID in the Africa's Talking dashboard for custom branding.
//   Leave AFRICASTALKING_SENDER_ID empty to use the shared shortcode.

import AfricasTalking from "africastalking";
import { env } from "../../config/env.js";
import type {
  SmsMessage,
  SmsProvider,
  SmsSendResult,
} from "./sms-provider.interface.js";

// Africa's Talking SMS send options shape (SDK is untyped; we define what we use).
interface AtSendOptions {
  to: string[];
  message: string;
  from?: string;
}

interface AtRecipient {
  number: string;
  status: string;
  statusCode: number;
  cost: string;
  messageId: string;
}

interface AtSendResponse {
  SMSMessageData: {
    Message: string;
    Recipients: AtRecipient[];
  };
}

export class AfricasTalkingAdapter implements SmsProvider {
  private readonly sms: {
    send(options: AtSendOptions): Promise<AtSendResponse>;
  };

  constructor() {
    // Credentials are validated by the factory before this constructor runs.
    const client = AfricasTalking({
      apiKey: env.AFRICASTALKING_API_KEY!,
      username: env.AFRICASTALKING_USERNAME!,
    });

    this.sms = client.SMS as typeof this.sms;
  }

  async sendSms(message: SmsMessage): Promise<SmsSendResult> {
    const options: AtSendOptions = {
      to: [message.to],
      message: message.body,
    };

    // Add a sender ID only when one is configured.
    // In sandbox mode the sender ID is ignored; in production it must be
    // registered with Africa's Talking.
    if (env.AFRICASTALKING_SENDER_ID) {
      options.from = env.AFRICASTALKING_SENDER_ID;
    }

    let response: AtSendResponse;
    try {
      response = await this.sms.send(options);
    } catch (err) {
      // Never log the message body — it may contain OTP values.
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Africa's Talking SMS delivery failed for ${message.to}: ${errMsg}`,
        { cause: err },
      );
    }

    // Check that the recipient was accepted.
    const recipients = response.SMSMessageData?.Recipients ?? [];
    const recipient = recipients[0];

    if (!recipient) {
      throw new Error(
        `Africa's Talking returned no recipient status for ${message.to}.`,
      );
    }

    // Status codes: 100 = accepted/queued; anything else is an error.
    // See https://developers.africastalking.com/docs/sms/sending
    if (recipient.statusCode !== 100 && recipient.statusCode !== 101) {
      throw new Error(
        `Africa's Talking rejected message to ${message.to}: ` +
          `status=${recipient.status} (code ${recipient.statusCode}).`,
      );
    }

    // Do not log OTP bodies. Log only the non-sensitive delivery confirmation.
    console.log(
      `[SMS] Delivered to ${message.to} via Africa's Talking. ` +
        `messageId=${recipient.messageId} status=${recipient.status}`,
    );

    return {
      provider_reference: recipient.messageId ?? null,
    };
  }
}
