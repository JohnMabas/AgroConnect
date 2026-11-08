// SMS provider interface. All SMS providers must implement this interface.
// Switch providers by changing the SMS_PROVIDER environment variable and
// supplying the relevant credentials — no changes to auth logic required.

export interface SmsMessage {
  to: string; // E.164 phone number
  body: string;
}

export interface SmsSendResult {
  provider_reference?: string | null;
}

export interface SmsProvider {
  sendSms(message: SmsMessage): Promise<SmsSendResult | void>;
}
