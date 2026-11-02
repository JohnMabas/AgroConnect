// Email provider interface. All email providers must implement this interface.

export interface EmailMessage {
  to: string;
  subject: string;
  text: string; // Plain-text fallback
  html?: string; // Optional HTML version
}

export interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<void>;
}
