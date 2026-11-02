export interface SafeUser {
  id: string;
  display_name: string | null;
  phone_number: string | null;
  email: string | null;
  status: "pending" | "active" | "suspended";
  phone_verified: boolean;
  email_verified: boolean;
  roles: string[];
  created_at: Date;
}

export interface RegisterResult {
  user: SafeUser;
  /** Present when the user registered with a phone number — send this to the OTP verification page. */
  phone_otp_pending?: boolean;
  /** Present when the user registered with an email — indicates email verification was sent. */
  email_verification_pending?: boolean;
}

export interface LoginResult {
  user: SafeUser;
  access_token: string;
  refresh_token: string;
}
