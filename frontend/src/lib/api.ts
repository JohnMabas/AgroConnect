// API base URL — injected at build time via NEXT_PUBLIC_API_URL.
// Falls back to localhost for development.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

/**
 * Build an absolute API URL from an API path, server-relative path, or absolute URL.
 * Normalizes duplicate `/api` prefixes when API_BASE already includes `/api`.
 */
export function buildApiUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl) || pathOrUrl.startsWith("blob:") || pathOrUrl.startsWith("data:")) {
    return pathOrUrl;
  }

  const base = API_BASE.replace(/\/+$/, "");
  let path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;

  // Avoid .../api/api/... when the backend returns a path that already starts with /api.
  if (base.endsWith("/api") && path.startsWith("/api/")) {
    path = path.slice(4);
  }

  return `${base}${path}`;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: Array<{ field: string; message: string }>,
    public readonly data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function uploadFormData<T>(
  path: string,
  formData: FormData,
  token: string,
  onProgress?: (percent: number) => void,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timeoutMs = options.timeoutMs ?? 60_000;
    const controller = new AbortController();
    let timedOut = false;
    let settled = false;

    const onAbort = () => xhr.abort();
    const onExternalAbort = () => {
      timedOut = false;
      controller.abort();
    };
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      controller.signal.removeEventListener("abort", onAbort);
      options.signal?.removeEventListener("abort", onExternalAbort);
      callback();
    };

    controller.signal.addEventListener("abort", onAbort, { once: true });
    if (options.signal?.aborted) {
      finish(() => reject(new ApiError(0, "Upload canceled.")));
      return;
    }
    if (options.signal) {
      options.signal.addEventListener("abort", onExternalAbort, { once: true });
    }

    xhr.open("POST", `${API_BASE}${path}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      finish(() => {
        let body: {
          error?: { message?: string };
          message?: string;
          errors?: Array<{ field: string; message: string }>;
          data?: Record<string, unknown>;
        } = {};
        try {
          const parsed: unknown = xhr.responseText
            ? JSON.parse(xhr.responseText)
            : {};
          body = parsed as typeof body;
        } catch {
          body = {};
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body as T);
          return;
        }

        reject(
          new ApiError(
            xhr.status,
            body?.error?.message ?? body?.message ?? "Upload failed.",
            body?.errors,
            body?.data,
          ),
        );
      });
    };

    xhr.onerror = () => {
      finish(() =>
        reject(
          new ApiError(
            0,
            "Network error during upload. Check your connection and retry.",
          ),
        ),
      );
    };

    xhr.onabort = () => {
      finish(() =>
        reject(
          new ApiError(
            timedOut ? 504 : 0,
            timedOut
              ? "Upload timed out. Please retry."
              : "Upload canceled.",
          ),
        ),
      );
    };

    xhr.send(formData);
  });
}

const isFormData = (body: BodyInit | null | undefined): boolean =>
  typeof FormData !== "undefined" && body instanceof FormData;

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: "include", // send/receive HttpOnly cookies
    headers: {
      // Let the browser set the multipart boundary for FormData uploads.
      ...(isFormData(options.body) ? {} : { "Content-Type": "application/json" }),
      ...(options.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error?.message ?? body?.message ?? "An error occurred.",
      body?.errors,
      body?.data,
    );
  }

  return body as T;
}

/**
 * Resolve a server-relative media path (for example `/uploads/listings/...`)
 * to an absolute URL that the browser can render.
 */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }
  const origin = API_BASE.replace(/\/api\/?$/, "");
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
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

export type SelfRegistrationRole =
  | "farmer"
  | "buyer"
  | "cooperative"
  | "transporter";

export interface RegisterPayload {
  display_name?: string;
  phone_number?: string;
  email?: string;
  password: string;
  password_confirm: string;
  role?: SelfRegistrationRole;
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

  verifyEmail(input: { userId?: string; email?: string; code: string }) {
    const payload: Record<string, string> = { otp: input.code };
    if (input.userId) payload.user_id = input.userId;
    if (input.email) payload.email = input.email;
    return request("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  resendEmailVerification(
    input: { userId?: string; email?: string } | string,
  ) {
    const payload: Record<string, string> =
      typeof input === "string"
        ? { user_id: input }
        : {
            ...(input.userId ? { user_id: input.userId } : {}),
            ...(input.email ? { email: input.email } : {}),
          };
    return request("/auth/resend-email-verification", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  forgotPassword(identifier: string) {
    return request<{
      success: boolean;
      message: string;
      data: { retry_after_seconds: number };
    }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ identifier }),
    });
  },

  resetPassword(payload: {
    identifier: string;
    code: string;
    password: string;
    password_confirm: string;
  }) {
    return request<{ success: boolean; message: string }>(
      "/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
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

// ─── Phase 4 API additions ────────────────────────────────────────────────────

export interface UserProfileData {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  profile_image_public_id?: string | null;
  country: string | null;
  state_or_region: string | null;
  local_government_area: string | null;
  city_or_community: string | null;
  preferred_language: string;
}

export type FarmerVerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

export type FarmSizeUnit = "hectares" | "acres" | "plots";

export interface FarmerProfileData {
  id: string;
  farm_name: string | null;
  farm_image_url: string | null;
  farm_image_public_id?: string | null;
  farming_experience_years: number | null;
  farm_location: string | null;
  farm_size: number | null;
  farm_size_unit: FarmSizeUnit | null;
  farming_description: string | null;
  primary_produce_interests: string[] | null;
  verification_status: FarmerVerificationStatus;
  cooperative_memberships?: Array<{
    cooperative_id: string;
    cooperative_name: string;
    status: string;
  }>;
}

export const profileApi = {
  getMe: (token: string) =>
    request<{ success: boolean; data: { profile: UserProfileData } }>(
      "/profiles/me",
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  updateMe: (token: string, data: Partial<UserProfileData>) =>
    request<{ success: boolean; data: { profile: UserProfileData } }>(
      "/profiles/me",
      {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
  uploadImage: (
    token: string,
    file: File,
    onProgress?: (percent: number) => void,
  ) => {
    const form = new FormData();
    form.append("image", file);
    return uploadFormData<{ success: boolean; data: { profile: UserProfileData } }>(
      "/profiles/me/image",
      form,
      token,
      onProgress,
    );
  },
  deleteImage: (token: string) =>
    request<{ success: boolean; data: { profile: UserProfileData } }>(
      "/profiles/me/image",
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};

export const farmerApi = {
  create: (token: string, data: object) =>
    request("/farmers/profile", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),
  getMe: (token: string) =>
    request("/farmers/profile/me", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateMe: (token: string, data: object) =>
    request("/farmers/profile/me", {
      method: "PUT",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),
  uploadImage: (
    token: string,
    file: File,
    onProgress?: (percent: number) => void,
  ) => {
    const form = new FormData();
    form.append("image", file);
    return uploadFormData<{
      success: boolean;
      data: { profile: FarmerProfileData };
    }>("/farmers/profile/me/image", form, token, onProgress);
  },
  deleteImage: (token: string) =>
    request<{
      success: boolean;
      data: { profile: FarmerProfileData };
    }>("/farmers/profile/me/image", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const transporterApi = {
  create: (token: string, data: object) =>
    request("/transporters/profile", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),
  getMe: (token: string) =>
    request("/transporters/profile", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateMe: (token: string, data: object) =>
    request("/transporters/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const cooperativeApi = {
  create: (token: string, data: object) =>
    request("/cooperatives", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),
  getMe: (token: string) =>
    request("/cooperatives/me", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getApproved: (token: string) =>
    request("/cooperatives/approved", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getMyMemberships: (token: string) =>
    request("/cooperatives/memberships/me", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  requestMembership: (token: string, coopId: string) =>
    request(`/cooperatives/${coopId}/memberships`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  leaveMembership: (token: string, coopId: string, membershipId: string) =>
    request(`/cooperatives/${coopId}/memberships/${membershipId}/leave`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  getMembers: (token: string, coopId: string) =>
    request(`/cooperatives/${coopId}/memberships`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getAgents: (token: string, coopId: string) =>
    request(`/cooperatives/${coopId}/agents`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  adminList: (token: string) =>
    request("/cooperatives/admin/review", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  adminApprove: (token: string, id: string) =>
    request(`/cooperatives/admin/${id}/approve`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }),
  adminReject: (token: string, id: string, notes: string) =>
    request(`/cooperatives/admin/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ notes }),
      headers: { Authorization: `Bearer ${token}` },
    }),
  adminSuspend: (token: string, id: string, notes: string) =>
    request(`/cooperatives/admin/${id}/suspend`, {
      method: "PATCH",
      body: JSON.stringify({ notes }),
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateMembershipStatus: (
    token: string,
    coopId: string,
    membershipId: string,
    status: string,
  ) =>
    request(`/cooperatives/${coopId}/memberships/${membershipId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
      headers: { Authorization: `Bearer ${token}` },
    }),
  getById: (id: string) =>
    request(`/cooperatives/${id}`),
};

export const agentApi = {
  getAssignments: (token: string) =>
    request("/agents/me/assignments", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getActivities: (token: string) =>
    request("/agents/me/activities", {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ─── Phase 5 API additions ────────────────────────────────────────────────────

export interface ProduceCategoryData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
}

export interface ProduceTypeData {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  secure_url?: string | null;
  public_id?: string | null;
  is_active: boolean;
  category?: ProduceCategoryData;
}

export interface ListingFarmerData {
  id: string;
  display_name: string | null;
}

export interface ListingData {
  id: string;
  farmer_user_id: string;
  produce_type_id: string;
  title: string;
  description: string | null;
  variety: string | null;
  grade: string | null;
  quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  sold_quantity: number;
  unit: string;
  packaging_description: string | null;
  price_per_unit: number;
  currency: string;
  country: string | null;
  state_or_region: string | null;
  status: "draft" | "published" | "paused" | "sold_out" | "closed" | "expired";
  is_available: boolean;
  harvest_date: string | null;
  available_from: string | null;
  expiry_date: string | null;
  local_government_area: string | null;
  community: string | null;
  collection_location: string | null;
  produce_type?: ProduceTypeData;
  farmer?: ListingFarmerData;
  images?: ListingImageData[];
  created_at: string;
  updated_at: string;
}

export interface ListingImageData {
  id: string;
  listing_id: string;
  image_url: string;
  secure_url?: string | null;
  public_id?: string | null;
  is_primary: boolean;
  display_order: number;
  created_at?: string;
}

export interface InventoryAdjustmentData {
  id: string;
  listing_id: string;
  farmer_user_id: string;
  adjustment_type: "stock_added" | "stock_removed" | "correction";
  quantity_change: number;
  previous_available_quantity: number;
  new_available_quantity: number;
  reason: string | null;
  created_at: string;
}

export interface InventorySummaryData {
  listing_id: string;
  title: string;
  status: ListingData["status"];
  quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  sold_quantity: number;
  unit: string;
  is_balanced: boolean;
}

export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedListingsData {
  listings: ListingData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedAdjustmentsData {
  adjustments: InventoryAdjustmentData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const produceApi = {
  getCategories: () =>
    request<{ success: boolean; data: { categories: ProduceCategoryData[] } }>(
      "/produce/categories",
    ),
  getTypes: (params?: { category_slug?: string; category_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.category_slug) query.set("category_slug", params.category_slug);
    if (params?.category_id) query.set("category_id", params.category_id);
    const suffix = query.toString();
    return request<{ success: boolean; data: { types: ProduceTypeData[] } }>(
      `/produce/types${suffix ? `?${suffix}` : ""}`,
    );
  },
  getType: (id: string) =>
    request<{ success: boolean; data: { type: ProduceTypeData } }>(
      `/produce/types/${id}`,
    ),
  uploadImage: (
    token: string,
    id: string,
    file: File,
    onProgress?: (percent: number) => void,
  ) => {
    const form = new FormData();
    form.append("image", file);
    return uploadFormData<{ success: boolean; data: { type: ProduceTypeData } }>(
      `/produce/types/${id}/image`,
      form,
      token,
      onProgress,
    );
  },
  deleteImage: (token: string, id: string) =>
    request<{ success: boolean; data: { type: ProduceTypeData } }>(
      `/produce/types/${id}/image`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};

export interface ListingResponse {
  success: boolean;
  message?: string;
  data: { listing: ListingData };
}

export interface ImageResponse {
  success: boolean;
  message?: string;
  data: { image: ListingImageData };
}

export const listingsApi = {
  create: (token: string, data: object): Promise<ListingResponse> =>
    request("/listings", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),
  getMe: (token: string, page = 1, limit = 20) =>
    request<{ success: boolean; data: PaginatedListingsData }>(
      `/listings/me?page=${page}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  getById: (id: string, token?: string): Promise<ListingResponse> =>
    request(
      `/listings/${id}`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : {},
    ),
  update: (token: string, id: string, data: object): Promise<ListingResponse> =>
    request(`/listings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),
  publish: (token: string, id: string): Promise<ListingResponse> =>
    request(`/listings/${id}/publish`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }),
  pause: (token: string, id: string): Promise<ListingResponse> =>
    request(`/listings/${id}/pause`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }),
  resume: (token: string, id: string): Promise<ListingResponse> =>
    request(`/listings/${id}/resume`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }),
  close: (token: string, id: string): Promise<ListingResponse> =>
    request(`/listings/${id}/close`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }),
  delete: (token: string, id: string) =>
    request(`/listings/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),
  /**
   * Upload a local image file, or link an external image URL as a development
   * fallback when no object storage is configured.
   */
  addImage: (
    token: string,
    id: string,
    image: File | string,
    onProgress?: (percent: number) => void,
    options?: { signal?: AbortSignal; timeoutMs?: number },
  ): Promise<ImageResponse> => {
    if (typeof image === "string") {
      return request(`/listings/${id}/images`, {
        method: "POST",
        body: JSON.stringify({ image_url: image }),
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    const form = new FormData();
    form.append("image", image);
    return uploadFormData<ImageResponse>(
      `/listings/${id}/images`,
      form,
      token,
      onProgress,
      options,
    );
  },
  deleteImage: (token: string, id: string, imageId: string) =>
    request(`/listings/${id}/images/${imageId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),
  setPrimaryImage: (
    token: string,
    id: string,
    imageId: string,
  ): Promise<ImageResponse> =>
    request(`/listings/${id}/images/${imageId}/primary`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }),
  getInventory: (
    token: string,
    id: string,
  ): Promise<{ success: boolean; data: { inventory: InventorySummaryData } }> =>
    request(`/listings/${id}/inventory`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  createAdjustment: (
    token: string,
    id: string,
    data: {
      adjustment_type: InventoryAdjustmentData["adjustment_type"];
      quantity_change: number;
      reason?: string;
    },
  ): Promise<{ success: boolean; data: { adjustment: InventoryAdjustmentData } }> =>
    request(`/listings/${id}/inventory/adjustments`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),
  getAdjustments: (
    token: string,
    id: string,
    page = 1,
    limit = 20,
  ): Promise<{ success: boolean; data: PaginatedAdjustmentsData }> =>
    request(`/listings/${id}/inventory/adjustments?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ─── Phase 18: controlled pilot readiness ────────────────────────────────────

export type PilotReadinessStatus =
  | "not_implemented"
  | "implemented_not_tested"
  | "testing_in_progress"
  | "passed"
  | "blocked"
  | "sandbox_tested_only"
  | "prepared_awaiting_provider_approval"
  | "ready_for_controlled_pilot";

export interface PilotReadinessModule {
  key: string;
  name: string;
  category: string;
  critical: boolean;
  implementation_status: string;
  testing_status: string;
  integration_status: string;
  pilot_readiness: PilotReadinessStatus;
  evidence: string[];
  known_issues: string[];
  dependencies: string[];
  runtime_notes: string[];
  source: "catalog" | "admin_review";
  override: Record<string, unknown> | null;
}

export interface PilotReadinessReport {
  generated_at: string;
  pilot_configuration: PilotConfigurationData | null;
  launch_recommendation:
    | "NOT_READY"
    | "INTERNAL_TESTING_READY"
    | "CONTROLLED_PILOT_READY";
  recommendation_reason: string;
  summary: {
    total_modules: number;
    critical_modules: number;
    counts_by_readiness: Record<string, number>;
    counts_by_testing: Record<string, number>;
    counts_by_integration: Record<string, number>;
    critical_blockers: string[];
    modules_awaiting_provider_approval: string[];
  };
  modules: PilotReadinessModule[];
}

export interface PilotConfigurationData {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  country: string;
  state_or_region: string;
  start_date: string | null;
  end_date: string | null;
  locations: string[];
  produce_category_ids: string[];
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PilotParticipantData {
  id: string;
  pilot_configuration_id: string;
  user_id: string;
  participant_type: string;
  status: string;
  consent_given_at: string | null;
  consent_version: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface PilotFeedbackData {
  id: string;
  feedback_number: string;
  pilot_configuration_id: string | null;
  user_id: string;
  participant_type: string | null;
  category: string;
  description: string;
  severity: "low" | "normal" | "high" | "critical";
  status: string;
  assigned_admin_user_id: string | null;
  resolution_notes: string | null;
  related_complaint_id: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface PilotMetrics {
  pilot_configuration_id: string;
  generated_at: string;
  window: { start: string | null; end: string | null; timezone: string };
  farmers: Record<string, number>;
  buyers: Record<string, number>;
  marketplace: Record<string, number>;
  accessibility: Record<string, number>;
  trust: Record<string, number>;
  participation: Record<string, number>;
}

export const pilotApi = {
  getReadiness: (token: string) =>
    request<{ success: boolean; data: PilotReadinessReport }>(
      "/admin/pilot/readiness",
      { headers: { Authorization: `Bearer ${token}` } },
    ),

  listConfigurations: (token: string) =>
    request<{
      success: boolean;
      data: { items: PilotConfigurationData[] };
    }>("/admin/pilot/configurations", {
      headers: { Authorization: `Bearer ${token}` },
    }),

  createConfiguration: (
    token: string,
    data: {
      name: string;
      country?: string;
      state_or_region?: string;
      start_date?: string | null;
      end_date?: string | null;
      locations?: string[];
      is_active?: boolean;
      notes?: string;
    },
  ) =>
    request<{
      success: boolean;
      data: { configuration: PilotConfigurationData };
    }>("/admin/pilot/configurations", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),

  updateConfiguration: (
    token: string,
    id: string,
    data: Partial<{
      name: string;
      status: PilotConfigurationData["status"];
      is_active: boolean;
      notes: string | null;
      start_date: string | null;
      end_date: string | null;
      locations: string[];
    }>,
  ) =>
    request<{
      success: boolean;
      data: { configuration: PilotConfigurationData };
    }>(`/admin/pilot/configurations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),

  listParticipants: (token: string, id: string) =>
    request<{
      success: boolean;
      data: { items: PilotParticipantData[] };
    }>(`/admin/pilot/configurations/${id}/participants`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  addParticipant: (
    token: string,
    id: string,
    data: {
      user_id: string;
      participant_type: string;
      status?: string;
      consent_confirmed: boolean;
      consent_version?: string;
      notes?: string;
    },
  ) =>
    request<{
      success: boolean;
      data: { participant: PilotParticipantData };
    }>(`/admin/pilot/configurations/${id}/participants`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),

  updateParticipant: (
    token: string,
    configurationId: string,
    participantId: string,
    data: {
      status?: string;
      consent_confirmed?: boolean;
      consent_version?: string;
      notes?: string | null;
    },
  ) =>
    request<{
      success: boolean;
      data: { participant: PilotParticipantData };
    }>(
      `/admin/pilot/configurations/${configurationId}/participants/${participantId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { Authorization: `Bearer ${token}` },
      },
    ),

  getMetrics: (token: string, id: string) =>
    request<{ success: boolean; data: PilotMetrics }>(
      `/admin/pilot/configurations/${id}/metrics`,
      { headers: { Authorization: `Bearer ${token}` } },
    ),

  listFeedback: (token: string, query = "") =>
    request<{
      success: boolean;
      data: { items: PilotFeedbackData[] };
    }>(`/admin/pilot/feedback${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  updateFeedback: (
    token: string,
    id: string,
    data: {
      status?: string;
      severity?: string;
      assigned_admin_user_id?: string | null;
      resolution_notes?: string | null;
    },
  ) =>
    request<{ success: boolean; data: { feedback: PilotFeedbackData } }>(
      `/admin/pilot/feedback/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { Authorization: `Bearer ${token}` },
      },
    ),

  overrideReadiness: (
    token: string,
    configurationId: string,
    moduleKey: string,
    data: {
      testing_status?: string;
      integration_status?: string;
      pilot_readiness?: string;
      known_issues?: string[];
      evidence?: string[];
      notes?: string;
    },
  ) =>
    request<{ success: boolean; data: PilotReadinessReport }>(
      `/admin/pilot/configurations/${configurationId}/readiness/${moduleKey}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};

// ─── Phase 6: Buyer Requests API ──────────────────────────────────────────────

export interface BuyerRequestData {
  id: string;
  buyer_user_id: string;
  produce_type_id: string | null;
  produce_category_id: string | null;
  requested_quantity: number;
  unit: string;
  preferred_location: string | null;
  country: string | null;
  state_or_region: string | null;
  local_government_area: string | null;
  community: string | null;
  target_price_per_unit: number | null;
  currency: string;
  additional_requirements: string | null;
  required_delivery_date: string | null;
  expiry_date: string;
  status: "open" | "paused" | "fulfilled" | "cancelled" | "expired";
  is_active: boolean;
  produce_type?: {
    id: string;
    category_id: string;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    public_id?: string | null;
    is_active: boolean;
    category?: ProduceCategoryData;
  };
  produce_category?: ProduceCategoryData;
  buyer?: { id: string; display_name: string | null };
  created_at: string;
  updated_at: string;
}

export interface PaginatedBuyerRequestsData {
  requests: BuyerRequestData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface BuyerRequestsListParams {
  search?: string;
  category_slug?: string;
  produce_type_id?: string;
  location?: string;
  min_quantity?: number;
  max_quantity?: number;
  min_target_price?: number;
  max_target_price?: number;
  required_delivery_after?: string;
  required_delivery_before?: string;
  sort?: "newest" | "delivery_soonest";
  page?: number;
  limit?: number;
}

export interface CreateBuyerRequestPayload {
  produce_type_id?: string | null;
  produce_category_id?: string | null;
  requested_quantity: number;
  unit: string;
  preferred_location?: string | null;
  country?: string | null;
  state_or_region?: string | null;
  local_government_area?: string | null;
  community?: string | null;
  target_price_per_unit?: number | null;
  currency?: string;
  additional_requirements?: string | null;
  required_delivery_date?: string | null;
  expiry_date: string;
}

export const buyerRequestsApi = {
  /** List open buyer requests (public — no token required) */
  list: (
    token: string | null | undefined,
    params: BuyerRequestsListParams = {},
  ) => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.category_slug) q.set("category_slug", params.category_slug);
    if (params.produce_type_id) q.set("produce_type_id", params.produce_type_id);
    if (params.location) q.set("location", params.location);
    if (params.min_quantity !== undefined) q.set("min_quantity", String(params.min_quantity));
    if (params.max_quantity !== undefined) q.set("max_quantity", String(params.max_quantity));
    if (params.min_target_price !== undefined) q.set("min_target_price", String(params.min_target_price));
    if (params.max_target_price !== undefined) q.set("max_target_price", String(params.max_target_price));
    if (params.required_delivery_after) q.set("required_delivery_after", params.required_delivery_after);
    if (params.required_delivery_before) q.set("required_delivery_before", params.required_delivery_before);
    if (params.sort) q.set("sort", params.sort);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    const suffix = q.toString();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return request<{ success: boolean; data: PaginatedBuyerRequestsData }>(
      `/buyer-requests${suffix ? `?${suffix}` : ""}`,
      { headers },
    );
  },

  /** Get a single buyer request by ID (open requests are public) */
  getById: (
    token: string | null | undefined,
    id: string,
  ) => {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return request<{ success: boolean; data: { request: BuyerRequestData } }>(
      `/buyer-requests/${id}`,
      { headers },
    );
  },

  /** Create a new buyer request (requires auth) */
  create: (token: string, data: CreateBuyerRequestPayload) =>
    request<{ success: boolean; message: string; data: { request: BuyerRequestData } }>(
      "/buyer-requests",
      {
        method: "POST",
        body: JSON.stringify(data),
        headers: { Authorization: `Bearer ${token}` },
      },
    ),

  /** Update an owned open/paused request */
  update: (token: string, id: string, data: Partial<CreateBuyerRequestPayload>) =>
    request<{ success: boolean; message: string; data: { request: BuyerRequestData } }>(
      `/buyer-requests/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { Authorization: `Bearer ${token}` },
      },
    ),

  /** Pause an open request */
  pause: (token: string, id: string) =>
    request<{ success: boolean; message: string; data: { request: BuyerRequestData } }>(
      `/buyer-requests/${id}/pause`,
      { method: "PATCH", headers: { Authorization: `Bearer ${token}` } },
    ),

  /** Reopen a paused request */
  reopen: (token: string, id: string) =>
    request<{ success: boolean; message: string; data: { request: BuyerRequestData } }>(
      `/buyer-requests/${id}/reopen`,
      { method: "PATCH", headers: { Authorization: `Bearer ${token}` } },
    ),

  /** Mark a request as fulfilled */
  fulfill: (token: string, id: string) =>
    request<{ success: boolean; message: string; data: { request: BuyerRequestData } }>(
      `/buyer-requests/${id}/fulfill`,
      { method: "PATCH", headers: { Authorization: `Bearer ${token}` } },
    ),

  /** Cancel a request */
  cancel: (token: string, id: string) =>
    request<{ success: boolean; message: string; data: { request: BuyerRequestData } }>(
      `/buyer-requests/${id}/cancel`,
      { method: "PATCH", headers: { Authorization: `Bearer ${token}` } },
    ),

  /** Get the authenticated user's own requests */
  getMyRequests: (
    token: string,
    params: { status?: string; page?: number; limit?: number } = {},
  ) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    const suffix = q.toString();
    return request<{ success: boolean; data: PaginatedBuyerRequestsData }>(
      `/buyer-requests/me${suffix ? `?${suffix}` : ""}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  },
};

function withQuery<T extends object>(
  path: string,
  params: T,
): string {
  const query = new URLSearchParams();
  const entries = params as Record<string, string | number | undefined>;
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export type OfferStatus =
  | "pending"
  | "countered"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired";

export interface OfferUserSummary {
  id: string;
  display_name: string | null;
}

export interface OfferListingSummary {
  id: string;
  title: string;
  status: string;
  farmer_user_id: string;
  available_quantity: number;
  unit: string;
  price_per_unit: number;
  currency: string;
}

export interface OfferBuyerRequestSummary {
  id: string;
  status: string;
  buyer_user_id: string;
  requested_quantity: number;
  unit: string;
  currency: string;
  expiry_date: string;
}

export interface OfferData {
  id: string;
  offer_number: string;
  listing_id: string | null;
  buyer_request_id: string | null;
  conversation_id: string | null;
  buyer_id: string;
  farmer_id: string;
  created_by: string;
  recipient_user_id: string;
  parent_offer_id: string | null;
  root_offer_id: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  currency: string;
  delivery_terms: string | null;
  delivery_location: string | null;
  delivery_date: string | null;
  buyer_message: string | null;
  status: OfferStatus;
  expires_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  withdrawn_at: string | null;
  expired_at: string | null;
  countered_at: string | null;
  buyer?: OfferUserSummary;
  farmer?: OfferUserSummary;
  listing?: OfferListingSummary;
  buyer_request?: OfferBuyerRequestSummary;
  created_at: string;
  updated_at: string;
}

export interface OfferEventData {
  id: string;
  offer_id: string;
  actor_user_id: string | null;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface OfferHistoryData {
  root_offer_id: string;
  offers: OfferData[];
  events: OfferEventData[];
}

export interface PaginatedOffersData {
  offers: OfferData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface OfferTermsPayload {
  quantity: number;
  unit: string;
  unit_price: number;
  currency?: string;
  delivery_terms?: string | null;
  delivery_location?: string | null;
  delivery_date?: string | null;
  buyer_message?: string | null;
  expires_at?: string;
}

export interface CreateOfferPayload extends OfferTermsPayload {
  listing_id?: string;
  buyer_request_id?: string;
  conversation_id?: string;
}

export interface ListOffersParams {
  page?: number;
  limit?: number;
  status?: OfferStatus;
  role?: "buyer" | "farmer";
  direction?: "sent" | "received";
  listing_id?: string;
  buyer_request_id?: string;
  conversation_id?: string;
  sort?: "newest" | "expiring_soon";
}

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "ready_for_delivery"
  | "in_transit"
  | "delivered"
  | "completed"
  | "cancelled"
  | "payment_failed"
  | "refunded";

export type OrderPaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export type PaymentStatus =
  | "pending"
  | "success"
  | "failed"
  | "abandoned"
  | "refunded"
  | "partially_refunded";

export type ReservationStatus =
  | "active"
  | "released"
  | "expired"
  | "consumed"
  | "void";

export type RefundStatus =
  | "pending"
  | "processing"
  | "processed"
  | "failed"
  | "needs_attention";

export interface OrderUserSummary {
  id: string;
  display_name: string | null;
}

export interface OrderListingSummary {
  id: string;
  title: string;
  status: string;
  farmer_user_id: string;
  available_quantity: number;
  reserved_quantity: number;
  sold_quantity: number;
  unit: string;
  price_per_unit: number;
  currency: string;
  expiry_date: string | null;
}

export interface OrderItemData {
  id: string;
  order_id: string;
  listing_id: string | null;
  title: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
}

export interface OrderReservationData {
  id: string;
  order_id: string;
  listing_id: string;
  quantity: number;
  status: ReservationStatus;
  expires_at: string;
  released_at: string | null;
  release_reason: string | null;
  is_expired: boolean;
}

export interface OrderEventData {
  id: string;
  order_id: string;
  actor_user_id: string | null;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface OrderPaymentSummary {
  id: string;
  reference: string;
  provider: string;
  amount_minor: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  authorization_url: string | null;
  access_code: string | null;
  channel: string | null;
  gateway_response: string | null;
  paid_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderData {
  id: string;
  order_number: string;
  offer_id: string;
  listing_id: string | null;
  buyer_id: string;
  farmer_id: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  currency: string;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  delivery_terms: string | null;
  delivery_location: string | null;
  delivery_date: string | null;
  buyer_message: string | null;
  reservation_expires_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  refunded_at: string | null;
  cancellation_reason: string | null;
  buyer?: OrderUserSummary;
  farmer?: OrderUserSummary;
  listing?: OrderListingSummary;
  item?: OrderItemData;
  reservation?: OrderReservationData;
  payments?: OrderPaymentSummary[];
  created_at: string;
  updated_at: string;
}

export interface OrderHistoryData {
  order_id: string;
  events: OrderEventData[];
}

export interface PaginatedOrdersData {
  orders: OrderData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedReservationsData {
  reservations: OrderReservationData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ListOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  payment_status?: OrderPaymentStatus;
  role?: "buyer" | "farmer";
  listing_id?: string;
  offer_id?: string;
  sort?: "newest" | "oldest";
}

export interface ListReservationsParams {
  page?: number;
  limit?: number;
  status?: ReservationStatus;
  order_id?: string;
  listing_id?: string;
}

export interface PaymentData extends OrderPaymentSummary {
  order_id: string;
  provider: string;
  authorization_url: string | null;
  access_code: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gateway_response: string | null;
  provider_transaction_id: string | null;
  paid_at: string | null;
  verified_at: string | null;
  last_error: string | null;
}

export interface RefundData {
  id: string;
  order_id: string;
  payment_id: string;
  requested_by_user_id: string | null;
  provider: string;
  provider_refund_id: string | null;
  transaction_reference: string;
  amount_minor: number;
  amount: number;
  currency: string;
  status: RefundStatus;
  customer_note: string | null;
  merchant_note: string | null;
  processed_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderFeeDisclosureData {
  id: string;
  order_id: string;
  cooperative_id: string | null;
  agent_user_id: string | null;
  fee_type: "cooperative_service_fee" | "agent_service_fee" | "platform_commission" | "other";
  amount_minor: string;
  currency: string;
  description: string | null;
  disclosed_at: string;
  agreed_by_farmer_user_id: string | null;
  agreed_at: string | null;
  farmer_approval_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RefundRequestPayload {
  amount?: number;
  customer_note?: string | null;
  merchant_note?: string | null;
}

export const offersApi = {
  create: (token: string, payload: CreateOfferPayload) =>
    request<{ success: boolean; message: string; data: { offer: OfferData } }>(
      "/offers",
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
  list: (token: string, params: ListOffersParams = {}) =>
    request<{ success: boolean; data: PaginatedOffersData }>(
      withQuery("/offers", params),
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  get: (token: string, offerId: string) =>
    request<{ success: boolean; data: { offer: OfferData } }>(
      `/offers/${encodeURIComponent(offerId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  history: (token: string, offerId: string) =>
    request<{ success: boolean; data: { history: OfferHistoryData } }>(
      `/offers/${encodeURIComponent(offerId)}/history`,
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  accept: (token: string, offerId: string) =>
    request<{ success: boolean; message: string; data: { offer: OfferData } }>(
      `/offers/${encodeURIComponent(offerId)}/accept`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } },
    ),
  reject: (token: string, offerId: string) =>
    request<{ success: boolean; message: string; data: { offer: OfferData } }>(
      `/offers/${encodeURIComponent(offerId)}/reject`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } },
    ),
  withdraw: (token: string, offerId: string) =>
    request<{ success: boolean; message: string; data: { offer: OfferData } }>(
      `/offers/${encodeURIComponent(offerId)}/withdraw`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } },
    ),
  counter: (token: string, offerId: string, payload: OfferTermsPayload) =>
    request<{
      success: boolean;
      message: string;
      data: { offer: OfferData; countered_offer: OfferData };
    }>(`/offers/${encodeURIComponent(offerId)}/counter`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const ordersApi = {
  create: (token: string, offerId: string) =>
    request<{ success: boolean; message: string; data: { order: OrderData } }>(
      "/orders",
      {
        method: "POST",
        body: JSON.stringify({ offer_id: offerId }),
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
  list: (token: string, params: ListOrdersParams = {}) =>
    request<{ success: boolean; data: PaginatedOrdersData }>(
      withQuery("/orders", params),
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  get: (token: string, orderId: string) =>
    request<{ success: boolean; data: { order: OrderData } }>(
      `/orders/${encodeURIComponent(orderId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  history: (token: string, orderId: string) =>
    request<{ success: boolean; data: { history: OrderHistoryData } }>(
      `/orders/${encodeURIComponent(orderId)}/history`,
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  reservation: (token: string, orderId: string) =>
    request<{ success: boolean; data: { reservation: OrderReservationData } }>(
      `/orders/${encodeURIComponent(orderId)}/reservation`,
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  payments: (token: string, orderId: string) =>
    request<{ success: boolean; data: { payments: OrderPaymentSummary[] } }>(
      `/orders/${encodeURIComponent(orderId)}/payments`,
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  feeDisclosures: (token: string, orderId: string) =>
    request<{ success: boolean; data: { fee_disclosures: OrderFeeDisclosureData[] } }>(
      `/orders/${encodeURIComponent(orderId)}/fee-disclosures`,
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  updateStatus: (token: string, orderId: string, status: Extract<OrderStatus, "processing" | "ready_for_delivery" | "in_transit" | "delivered" | "completed">) =>
    request<{ success: boolean; message: string; data: { order: OrderData } }>(
      `/orders/${encodeURIComponent(orderId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
  cancel: (token: string, orderId: string, reason: string) =>
    request<{ success: boolean; message: string; data: { order: OrderData } }>(
      `/orders/${encodeURIComponent(orderId)}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};

export const reservationsApi = {
  list: (token: string, params: ListReservationsParams = {}) =>
    request<{ success: boolean; data: PaginatedReservationsData }>(
      withQuery("/reservations", params),
      { headers: { Authorization: `Bearer ${token}` } },
    ),
};

export const paymentsApi = {
  initialize: (token: string, orderId: string) =>
    request<{
      success: boolean;
      message: string;
      data: {
        payment: PaymentData;
        authorization_url: string;
        access_code: string | null;
        order: OrderData;
      };
    }>("/payments/paystack/initialize", {
      method: "POST",
      body: JSON.stringify({ order_id: orderId }),
      headers: { Authorization: `Bearer ${token}` },
    }),
  verify: (token: string, reference: string) =>
    request<{ success: boolean; data: { payment: PaymentData; order: OrderData } }>(
      `/payments/paystack/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  requestRefund: (token: string, reference: string, payload: RefundRequestPayload = {}) =>
    request<{ success: boolean; message: string; data: { refund: RefundData } }>(
      `/payments/paystack/${encodeURIComponent(reference)}/refund`,
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
  getRefunds: (token: string, reference: string) =>
    request<{ success: boolean; data: { payment: PaymentData; refunds: RefundData[] } }>(
      `/payments/paystack/${encodeURIComponent(reference)}/refund`,
      { headers: { Authorization: `Bearer ${token}` } },
    ),
};

// ─── Phase 11: Notifications API ──────────────────────────────────────────────

export interface NotificationData {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  channel: "in_app" | "email" | "sms";
  related_entity_type: string | null;
  related_entity_id: string | null;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface PaginatedNotificationsData {
  notifications: NotificationData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  unread_count: number;
}

export const notificationsApi = {
  getNotifications: (
    token: string,
    params: { unread?: boolean; notification_type?: string; page?: number; limit?: number } = {},
  ) => {
    const q = new URLSearchParams();
    if (params.unread) q.set("unread", "true");
    if (params.notification_type) q.set("notification_type", params.notification_type);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    const suffix = q.toString();
    return request<{ success: boolean; data: PaginatedNotificationsData }>(
      `/notifications${suffix ? `?${suffix}` : ""}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  },
  getUnreadCount: (token: string) =>
    request<{ success: boolean; data: { unread_count: number } }>(
      "/notifications/unread-count",
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  markRead: (token: string, id: string) =>
    request<{ success: boolean; data: { notification: NotificationData } }>(
      `/notifications/${id}/read`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
  markAllRead: (token: string) =>
    request<{ success: boolean; message: string }>(
      "/notifications/read-all",
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};

// ─── Phase 10: Deliveries API ─────────────────────────────────────────────────

export interface DeliveryData {
  id: string;
  delivery_reference: string;
  order_id: string;
  status: "pending" | "assigned" | "accepted" | "picked_up" | "in_transit" | "delivered" | "completed" | "cancelled" | "failed";
  pickup_location: string | null;
  delivery_location: string | null;
  produce_description: string | null;
  quantity: number;
  unit: string;
  expected_pickup_date: string | null;
  expected_delivery_date: string | null;
  delivery_fee_minor: number | null;
  currency: string;
  cancellation_reason: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedDeliveriesData {
  deliveries: DeliveryData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const deliveriesApi = {
  getMyDeliveries: (token: string, params: { page?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    const suffix = q.toString();
    return request<{ success: boolean; data: PaginatedDeliveriesData }>(
      `/transporters/my-deliveries${suffix ? `?${suffix}` : ""}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  },
};

// ─── Phase 6: Marketplace API ─────────────────────────────────────────────────

export interface MarketplaceListingsParams {
  search?: string;
  category_slug?: string;
  produce_type_id?: string;
  location?: string;
  min_price?: number;
  max_price?: number;
  min_quantity?: number;
  max_quantity?: number;
  currency?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "quantity_asc" | "quantity_desc";
  page?: number;
  limit?: number;
}

export interface MarketplaceListingsResponse {
  success: boolean;
  data: {
    listings: ListingData[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export const marketplaceApi = {
  /**
   * Discover published, available listings.
   * Token is optional — unauthenticated visitors can browse.
   * When a valid token is supplied it is forwarded for future personalisation.
   */
  getListings(
    token: string | null | undefined,
    params: MarketplaceListingsParams = {},
  ): Promise<MarketplaceListingsResponse> {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.category_slug) q.set("category_slug", params.category_slug);
    if (params.produce_type_id) q.set("produce_type_id", params.produce_type_id);
    if (params.location) q.set("location", params.location);
    if (params.min_price !== undefined) q.set("min_price", String(params.min_price));
    if (params.max_price !== undefined) q.set("max_price", String(params.max_price));
    if (params.min_quantity !== undefined) q.set("min_quantity", String(params.min_quantity));
    if (params.max_quantity !== undefined) q.set("max_quantity", String(params.max_quantity));
    if (params.currency) q.set("currency", params.currency);
    if (params.sort) q.set("sort", params.sort);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    const suffix = q.toString();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return request(`/marketplace/listings${suffix ? `?${suffix}` : ""}`, { headers });
  },

  /**
   * Read a single published, available listing.
   * Token is optional — unauthenticated visitors can read listing details.
   */
  getListing(
    token: string | null | undefined,
    id: string,
  ): Promise<{ success: boolean; data: { listing: ListingData } }> {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return request(`/marketplace/listings/${id}`, { headers });
  },

  /**
   * Discover open buyer requests.
   */
  getRequests(token: string, params: MarketplaceListingsParams = {}): Promise<{ success: boolean; data: PaginatedBuyerRequestsData }> {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.location) q.set("location", params.location);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    const suffix = q.toString();
    return request(`/marketplace/requests${suffix ? `?${suffix}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Read a single open buyer request.
   */
  getRequest(token: string, id: string): Promise<{ success: boolean; data: { request: BuyerRequestData } }> {
    return request(`/marketplace/requests/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

// ─── Messaging API ─────────────────────────────────────────────────────────────

export const MESSAGE_MAX_LENGTH = 4000;
export const MESSAGE_MEDIA_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MESSAGE_MEDIA_MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024;
export const MESSAGE_MEDIA_MAX_ATTACHMENTS_PER_MESSAGE = 5;

export type MessageStatus = "sent" | "delivered" | "read";
export type MessageType = "text" | "image" | "audio" | "media";

export interface MessageAttachmentData {
  id: string;
  message_id: string;
  conversation_id: string;
  attachment_type: "image" | "audio";
  mime_type: string;
  file_name: string;
  file_size_bytes: number;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  download_url: string;
  created_at: string;
}

export interface MessageData {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  content: string;
  message_type: MessageType;
  status: MessageStatus;
  delivered_at: string | null;
  read_at: string | null;
  sender?: { id: string; display_name: string | null };
  attachments?: MessageAttachmentData[];
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipantData {
  user_id: string;
  display_name: string | null;
  last_read_at: string | null;
  joined_at: string;
}

export interface ConversationListingSummary {
  id: string;
  title: string;
  status: string;
  farmer_user_id: string;
}

export interface ConversationBuyerRequestSummary {
  id: string;
  status: string;
  buyer_user_id: string;
}

export type ConversationStatus = "active" | "archived" | "blocked";

export interface ConversationData {
  id: string;
  created_by_user_id: string;
  listing_id: string | null;
  buyer_request_id: string | null;
  status: ConversationStatus;
  last_message_at: string | null;
  participants: ConversationParticipantData[];
  listing?: ConversationListingSummary;
  buyer_request?: ConversationBuyerRequestSummary;
  last_message?: MessageData;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedConversationsData {
  conversations: ConversationData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedMessagesData {
  messages: MessageData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface UnreadCountData {
  total_unread: number;
  conversations: Array<{ conversation_id: string; unread_count: number }>;
}

export interface MarkReadResult {
  conversation_id: string;
  reader_user_id: string;
  read_at: string;
  message_ids: string[];
  participant_user_ids: string[];
}

export interface CreateConversationPayload {
  participant_user_id: string;
  listing_id?: string | null;
  buyer_request_id?: string | null;
}

export const messagingApi = {
  listConversations(
    token: string,
    params: {
      status?: ConversationStatus | "all";
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ success: boolean; data: PaginatedConversationsData }> {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    const suffix = q.toString();
    return request(`/conversations${suffix ? `?${suffix}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getConversation(
    token: string,
    id: string,
  ): Promise<{ success: boolean; data: { conversation: ConversationData } }> {
    return request(`/conversations/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  createConversation(
    token: string,
    payload: CreateConversationPayload,
  ): Promise<{
    success: boolean;
    message: string;
    data: { conversation: ConversationData };
  }> {
    return request("/conversations", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  },

  listMessages(
    token: string,
    conversationId: string,
    params: {
      page?: number;
      limit?: number;
      before?: string;
      order?: "asc" | "desc";
    } = {},
  ): Promise<{ success: boolean; data: PaginatedMessagesData }> {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.before) q.set("before", params.before);
    if (params.order) q.set("order", params.order);
    const suffix = q.toString();
    return request(`/conversations/${conversationId}/messages${suffix ? `?${suffix}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  sendMessage(
    token: string,
    conversationId: string,
    content: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: { message: MessageData };
  }> {
    return request(`/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content, message_type: "text" }),
    });
  },

  sendMessageWithAttachments(
    token: string,
    conversationId: string,
    payload: { content?: string; message_type?: MessageType; files?: File[] },
  ): Promise<{
    success: boolean;
    message: string;
    data: { message: MessageData };
  }> {
    const files = payload.files ?? [];
    if (files.length === 0) {
      return this.sendMessage(token, conversationId, payload.content ?? "");
    }
    const form = new FormData();
    if ((payload.content ?? "").length > 0) {
      form.append("content", payload.content ?? "");
    }
    if (payload.message_type) {
      form.append("message_type", payload.message_type);
    }
    for (const file of files) {
      form.append("attachments", file);
    }
    return request(`/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  },

  async downloadAttachment(
    token: string,
    downloadUrl: string,
  ): Promise<Blob> {
    const url = buildApiUrl(downloadUrl);
    const res = await fetch(url, {
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        body?.error?.message ?? body?.message ?? "Unable to load attachment.",
        body?.errors,
        body?.data,
      );
    }
    return res.blob();
  },

  markRead(
    token: string,
    conversationId: string,
    messageId?: string,
  ): Promise<{ success: boolean; message: string; data: MarkReadResult }> {
    return request(`/conversations/${conversationId}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(messageId ? { message_id: messageId } : {}),
    });
  },

  unarchiveConversation(
    token: string,
    id: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: { conversation: ConversationData };
  }> {
    return request(`/conversations/${id}/unarchive`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getUnreadCount(token: string): Promise<{ success: boolean; data: UnreadCountData }> {
    return request("/messages/unread-count", {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};


// ─── Calls API (WebRTC signaling support) ─────────────────────────────────────

export type CallType = "audio" | "video";
export type CallStatus =
  | "ringing"
  | "accepted"
  | "rejected"
  | "ended"
  | "missed"
  | "cancelled"
  | "failed";

export interface CallParticipantSummary {
  id: string;
  display_name: string | null;
}

export interface CallData {
  id: string;
  conversation_id: string;
  caller_user_id: string;
  callee_user_id: string;
  call_type: CallType;
  status: CallStatus;
  initiated_at: string;
  accepted_at: string | null;
  ended_at: string | null;
  ended_by_user_id: string | null;
  end_reason: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
  caller?: CallParticipantSummary;
  callee?: CallParticipantSummary;
}

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface CallConfigData {
  iceServers: IceServerConfig[];
  turnConfigured: boolean;
}

export interface PaginatedCallsData {
  calls: CallData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const callsApi = {
  getConfig(token: string): Promise<{ success: boolean; data: CallConfigData }> {
    return request("/calls/config", {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  create(
    token: string,
    payload: { conversation_id: string; callee_user_id: string; call_type: CallType },
  ): Promise<{ success: boolean; data: { call: CallData } }> {
    return request("/calls", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  },

  list(
    token: string,
    params: {
      page?: number;
      limit?: number;
      status?: CallStatus;
      conversation_id?: string;
    } = {},
  ): Promise<{ success: boolean; data: PaginatedCallsData }> {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.status) q.set("status", params.status);
    if (params.conversation_id) q.set("conversation_id", params.conversation_id);
    const suffix = q.toString();
    return request(`/calls${suffix ? `?${suffix}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  get(token: string, id: string): Promise<{ success: boolean; data: { call: CallData } }> {
    return request(`/calls/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  accept(
    token: string,
    id: string,
  ): Promise<{ success: boolean; data: { call: CallData } }> {
    return request(`/calls/${id}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
  },

  reject(
    token: string,
    id: string,
    reason?: string,
  ): Promise<{ success: boolean; data: { call: CallData } }> {
    return request(`/calls/${id}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(reason ? { reason } : {}),
    });
  },

  end(
    token: string,
    id: string,
    reason?: string,
  ): Promise<{ success: boolean; data: { call: CallData } }> {
    return request(`/calls/${id}/end`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(reason ? { reason } : {}),
    });
  },
};
