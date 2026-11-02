// API base URL — injected at build time via NEXT_PUBLIC_API_URL.
// Falls back to localhost for development.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: "include", // send/receive HttpOnly cookies
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error?.message ?? body?.message ?? "An error occurred.",
      body?.errors,
    );
  }

  return body as T;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export interface SafeUser {
  id: string;
  display_name: string | null;
  phone_number: string | null;
  email: string | null;
  status: "pending" | "active" | "suspended";
  phone_verified: boolean;
  email_verified: boolean;
  roles: string[];
  created_at: string;
}

export interface RegisterPayload {
  display_name?: string;
  phone_number?: string;
  email?: string;
  password: string;
  password_confirm: string;
}

export interface RegisterResponse {
  success: boolean;
  data: {
    user: SafeUser;
    phone_otp_pending?: boolean;
    email_verification_pending?: boolean;
  };
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: SafeUser;
    access_token: string;
  };
}

export interface MeResponse {
  success: boolean;
  data: { user: SafeUser };
}

export const authApi = {
  register(payload: RegisterPayload): Promise<RegisterResponse> {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  verifyPhone(userId: string, otp: string) {
    return request("/auth/verify-phone", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, otp }),
    });
  },

  resendPhoneOtp(userId: string) {
    return request("/auth/resend-phone-otp", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
  },

  verifyEmail(token: string) {
    return request("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  resendEmailVerification(userId: string) {
    return request("/auth/resend-email-verification", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
  },

  login(payload: LoginPayload): Promise<LoginResponse> {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  refresh(): Promise<LoginResponse> {
    return request("/auth/refresh", { method: "POST" });
  },

  logout(): Promise<void> {
    return request("/auth/logout", { method: "POST" });
  },

  me(accessToken: string): Promise<MeResponse> {
    return request("/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
