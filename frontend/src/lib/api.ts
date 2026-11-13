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

// ─── Phase 4 API additions ────────────────────────────────────────────────────

export interface UserProfileData {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  country: string | null;
  state_or_region: string | null;
  local_government_area: string | null;
  city_or_community: string | null;
  preferred_language: string;
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
  is_primary: boolean;
  display_order: number;
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
    return request(`/listings/${id}/images`, {
      method: "POST",
      body: form,
      headers: { Authorization: `Bearer ${token}` },
    });
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
