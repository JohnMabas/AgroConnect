import { Op, literal, type Includeable, type WhereOptions } from "sequelize";
import {
  AdminAuditLog,
  BuyerRequest,
  CooperativeProfile,
  Delivery,
  EmailVerificationToken,
  FarmerComplaint,
  FarmerProfile,
  IntegrityAssessment,
  Order,
  OrderFeeDisclosure,
  Payment,
  PhoneOtp,
  ProduceListing,
  ProduceType,
  Role,
  TransporterProfile,
  User,
  UserProfile,
} from "../../database/models/index.js";
import { buildOrderData } from "../orders/orders.service.js";
import type { OrderData } from "../orders/orders.types.js";
import { recordAdminAudit } from "./admin.audit.js";
import type {
  AdminAuditLogsQuery,
  AdminListingsQuery,
  AdminModerateListingInput,
  AdminOrdersQuery,
  AdminPaymentsQuery,
  AdminRejectTransporterInput,
  AdminTransportersQuery,
  AdminUserStatusInput,
  AdminUsersQuery,
} from "./admin.validation.js";
import type {
  AdminAuditLogData,
  AdminListingSummary,
  AdminOverviewData,
  AdminPaymentSummary,
  AdminPaymentsData,
  AdminTransporterSummary,
  AdminUserDetail,
  AdminUserSummary,
  PaginatedAdminAuditLogs,
  PaginatedAdminListings,
  PaginatedAdminTransporters,
  PaginatedAdminUsers,
} from "./admin.types.js";

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

function pages(total: number, limit: number): number {
  return total === 0 ? 0 : Math.ceil(total / limit);
}

function roleNames(user: User & { roles?: Role[] }): string[] {
  return (user.roles ?? []).map((role) => role.name);
}

function buildUserSummary(user: User & { roles?: Role[] }): AdminUserSummary {
  return {
    id: user.id,
    display_name: user.display_name ?? null,
    email: user.email ?? null,
    phone_number: user.phone_number ?? null,
    status: user.status ?? "pending",
    roles: roleNames(user),
    created_at: user.created_at!,
  };
}

// ─── Overview ────────────────────────────────────────────────────────────────

export async function getAdminOverview(): Promise<AdminOverviewData> {
  const activeDeliveryStatuses = [
    "assigned",
    "accepted",
    "picked_up",
    "in_transit",
  ];
  const pendingComplaintStatuses = [
    "submitted",
    "acknowledged",
    "under_review",
    "awaiting_information",
    "escalated",
  ];
  const openIntegrityStatuses = ["pending", "under_review", "escalated"];

  const roleCount = (name: string) =>
    User.count({
      include: [
        {
          model: Role,
          as: "roles",
          attributes: [],
          through: { attributes: [] },
          where: { name },
          required: true,
        },
      ],
    });

  const [
    totalUsers,
    totalFarmers,
    totalBuyers,
    registeredCooperatives,
    approvedTransporters,
    pendingTransporters,
    pendingCooperatives,
    activeListings,
    activeBuyerRequests,
    totalOrders,
    successfulPayments,
    pendingPayments,
    commission,
    activeDeliveries,
    pendingComplaints,
    openIntegrityAlerts,
  ] = await Promise.all([
    User.count(),
    roleCount("farmer"),
    roleCount("buyer"),
    CooperativeProfile.count(),
    TransporterProfile.count({ where: { approval_status: "approved" } }),
    TransporterProfile.count({ where: { approval_status: "pending" } }),
    CooperativeProfile.count({ where: { verification_status: "pending" } }),
    ProduceListing.count({ where: { status: "published" } }),
    BuyerRequest.count({ where: { status: "open" } }),
    Order.count(),
    Payment.count({ where: { status: "success" } }),
    Payment.count({ where: { status: "pending" } }),
    OrderFeeDisclosure.sum("amount_minor", {
      where: { fee_type: "platform_commission" },
    }),
    Delivery.count({ where: { status: { [Op.in]: activeDeliveryStatuses } } }),
    FarmerComplaint.count({
      where: { status: { [Op.in]: pendingComplaintStatuses } },
    }),
    IntegrityAssessment.count({
      where: { review_status: { [Op.in]: openIntegrityStatuses } },
    }),
  ]);

  return {
    total_users: totalUsers,
    total_farmers: totalFarmers,
    total_buyers: totalBuyers,
    registered_cooperatives: registeredCooperatives,
    approved_transporters: approvedTransporters,
    pending_transporters: pendingTransporters,
    pending_cooperatives: pendingCooperatives,
    active_listings: activeListings,
    active_buyer_requests: activeBuyerRequests,
    total_orders: totalOrders,
    successful_payments: successfulPayments,
    pending_payments: pendingPayments,
    recorded_platform_commission_minor: Number(commission ?? 0),
    platform_commission_currency: "NGN",
    active_deliveries: activeDeliveries,
    pending_complaints: pendingComplaints,
    open_integrity_alerts: openIntegrityAlerts,
  };
}

// ─── Users ───────────────────────────────────────────────────────────────────

const userRolesInclude: Includeable = {
  model: Role,
  as: "roles",
  attributes: ["name"],
  through: { attributes: [] },
};

export async function listAdminUsers(
  filters: AdminUsersQuery,
): Promise<PaginatedAdminUsers> {
  const where: WhereOptions = {};
  const mutable = where as Record<string, unknown>;
  if (filters.status) mutable.status = filters.status;
  if (filters.search) {
    const term = `%${filters.search}%`;
    mutable[Op.or as unknown as string] = [
      { display_name: { [Op.iLike]: term } },
      { email: { [Op.iLike]: term } },
      { phone_number: { [Op.iLike]: term } },
    ];
  }
  if (filters.role) {
    mutable.id = {
      [Op.in]: literal(
        `(SELECT ur.user_id FROM user_roles ur INNER JOIN roles r ON r.id = ur.role_id WHERE r.name = '${filters.role}')`,
      ),
    };
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    include: [userRolesInclude],
    order: [
      ["created_at", "DESC"],
      ["id", "ASC"],
    ],
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit,
    distinct: true,
  });

  const total = Number(count);
  return {
    users: (rows as Array<User & { roles?: Role[] }>).map(buildUserSummary),
    total,
    page: filters.page,
    limit: filters.limit,
    total_pages: pages(total, filters.limit),
  };
}

export async function getAdminUser(
  userId: string,
): Promise<AdminUserDetail> {
  const user = (await User.findByPk(userId, {
    include: [
      userRolesInclude,
      { model: UserProfile, as: "profile", required: false },
      { model: FarmerProfile, as: "farmer_profile", required: false },
    ],
  })) as
    | (User & {
        roles?: Role[];
        profile?: UserProfile | null;
        farmer_profile?: FarmerProfile | null;
      })
    | null;

  if (!user) {
    throw serviceError("User not found.", "NOT_FOUND");
  }

  const [emailVerified, phoneVerified] = await Promise.all([
    EmailVerificationToken.count({
      where: { user_id: userId, used: true },
    }),
    PhoneOtp.count({ where: { user_id: userId, used: true } }),
  ]);

  return {
    ...buildUserSummary(user),
    email_verified: emailVerified > 0,
    phone_verified: phoneVerified > 0,
    profile: user.profile
      ? {
          first_name: user.profile.first_name ?? null,
          last_name: user.profile.last_name ?? null,
          state_or_region: user.profile.state_or_region ?? null,
          local_government_area:
            user.profile.local_government_area ?? null,
          city_or_community: user.profile.city_or_community ?? null,
        }
      : null,
    farmer_verification_status:
      user.farmer_profile?.verification_status ?? null,
    last_updated: user.updated_at ?? null,
  };
}

export async function updateAdminUserStatus(
  adminUserId: string,
  userId: string,
  input: AdminUserStatusInput,
): Promise<AdminUserDetail> {
  if (adminUserId === userId) {
    throw serviceError(
      "You cannot change your own account status.",
      "FORBIDDEN",
    );
  }

  const user = (await User.findByPk(userId, {
    include: [userRolesInclude],
  })) as (User & { roles?: Role[] }) | null;
  if (!user) {
    throw serviceError("User not found.", "NOT_FOUND");
  }

  if (roleNames(user).includes("admin")) {
    throw serviceError(
      "Administrator accounts cannot be suspended from this interface.",
      "FORBIDDEN",
    );
  }

  const previousStatus = user.status ?? "pending";
  await user.update({ status: input.status });

  await recordAdminAudit({
    admin_user_id: adminUserId,
    action:
      input.status === "suspended" ? "user.suspend" : "user.reactivate",
    entity_type: "user",
    entity_id: userId,
    reason: input.reason ?? null,
    result: "success",
    metadata: { previous_status: previousStatus, new_status: input.status },
  });

  return getAdminUser(userId);
}

// ─── Transporters ────────────────────────────────────────────────────────────

const transporterUserInclude: Includeable = {
  model: User,
  as: "user",
  attributes: ["id", "display_name", "email", "phone_number"],
  required: false,
};

function buildTransporterSummary(
  row: TransporterProfile & { user?: User | null },
): AdminTransporterSummary {
  return {
    id: row.id,
    user_id: row.user_id,
    business_name: row.business_name,
    contact_phone: row.contact_phone,
    operating_location: row.operating_location,
    coverage_areas: row.coverage_areas ?? [],
    vehicle_type: row.vehicle_type ?? null,
    vehicle_registration_number: row.vehicle_registration_number ?? null,
    vehicle_capacity: row.vehicle_capacity ?? null,
    produce_types: row.produce_types ?? [],
    availability_status: row.availability_status ?? "unavailable",
    approval_status: row.approval_status ?? "pending",
    approved_at: row.approved_at ?? null,
    suspended_reason: row.suspended_reason ?? null,
    user_display_name: row.user?.display_name ?? null,
    user_email: row.user?.email ?? null,
    user_phone_number: row.user?.phone_number ?? null,
    created_at: row.created_at!,
  };
}

export async function listAdminTransporters(
  filters: AdminTransportersQuery,
): Promise<PaginatedAdminTransporters> {
  const where: WhereOptions = {};
  const mutable = where as Record<string, unknown>;
  if (filters.status) mutable.approval_status = filters.status;
  if (filters.search) {
    const term = `%${filters.search}%`;
    mutable[Op.or as unknown as string] = [
      { business_name: { [Op.iLike]: term } },
      { contact_phone: { [Op.iLike]: term } },
      { operating_location: { [Op.iLike]: term } },
      { "$user.display_name$": { [Op.iLike]: term } },
      { "$user.email$": { [Op.iLike]: term } },
      { "$user.phone_number$": { [Op.iLike]: term } },
    ];
  }

  const { rows, count } = await TransporterProfile.findAndCountAll({
    where,
    include: [transporterUserInclude],
    order: [
      ["created_at", "DESC"],
      ["id", "ASC"],
    ],
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit,
    distinct: true,
    subQuery: false,
  });

  const total = Number(count);
  return {
    transporters: (
      rows as Array<TransporterProfile & { user?: User | null }>
    ).map(buildTransporterSummary),
    total,
    page: filters.page,
    limit: filters.limit,
    total_pages: pages(total, filters.limit),
  };
}

export async function rejectAdminTransporter(
  adminUserId: string,
  transporterId: string,
  input: AdminRejectTransporterInput,
): Promise<AdminTransporterSummary> {
  const transporter = await TransporterProfile.findByPk(transporterId);
  if (!transporter) {
    throw serviceError("Transporter not found.", "NOT_FOUND");
  }

  const previousStatus = transporter.approval_status ?? "pending";
  await transporter.update({
    approval_status: "rejected",
    availability_status: "unavailable",
    suspended_reason: input.reason,
    approved_by_user_id: adminUserId,
    approved_at: null,
  });

  await recordAdminAudit({
    admin_user_id: adminUserId,
    action: "transporter.reject",
    entity_type: "transporter_profile",
    entity_id: transporterId,
    reason: input.reason,
    result: "success",
    metadata: { previous_status: previousStatus, new_status: "rejected" },
  });

  const row = (await TransporterProfile.findByPk(transporterId, {
    include: [transporterUserInclude],
  })) as (TransporterProfile & { user?: User | null }) | null;
  return buildTransporterSummary(row ?? transporter);
}

// ─── Listings ────────────────────────────────────────────────────────────────

const listingIncludes: Includeable[] = [
  {
    model: User,
    as: "farmer",
    attributes: ["id", "display_name"],
    required: false,
  },
  {
    model: ProduceType,
    as: "produce_type",
    attributes: ["id", "name"],
    required: false,
  },
];

function buildListingSummary(
  row: ProduceListing & {
    farmer?: User | null;
    produce_type?: ProduceType | null;
  },
): AdminListingSummary {
  return {
    id: row.id,
    title: row.title,
    status: row.status ?? "draft",
    farmer_user_id: row.farmer_user_id,
    farmer_display_name: row.farmer?.display_name ?? null,
    produce_type_name: row.produce_type?.name ?? null,
    quantity: Number(row.quantity),
    available_quantity: Number(row.available_quantity),
    reserved_quantity: Number(row.reserved_quantity),
    sold_quantity: Number(row.sold_quantity),
    unit: row.unit,
    price_per_unit: Number(row.price_per_unit),
    currency: row.currency,
    state_or_region: row.state_or_region ?? null,
    community: row.community ?? null,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

export async function listAdminListings(
  filters: AdminListingsQuery,
): Promise<PaginatedAdminListings> {
  const where: WhereOptions = {};
  const mutable = where as Record<string, unknown>;
  if (filters.status) mutable.status = filters.status;
  if (filters.farmer_user_id) {
    mutable.farmer_user_id = filters.farmer_user_id;
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    mutable[Op.or as unknown as string] = [
      { title: { [Op.iLike]: term } },
      { description: { [Op.iLike]: term } },
      { "$farmer.display_name$": { [Op.iLike]: term } },
    ];
  }

  const { rows, count } = await ProduceListing.findAndCountAll({
    where,
    include: listingIncludes,
    order: [
      ["created_at", "DESC"],
      ["id", "ASC"],
    ],
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit,
    distinct: true,
    subQuery: false,
  });

  const total = Number(count);
  return {
    listings: (
      rows as Array<
        ProduceListing & {
          farmer?: User | null;
          produce_type?: ProduceType | null;
        }
      >
    ).map(buildListingSummary),
    total,
    page: filters.page,
    limit: filters.limit,
    total_pages: pages(total, filters.limit),
  };
}

export async function moderateAdminListing(
  adminUserId: string,
  listingId: string,
  input: AdminModerateListingInput,
): Promise<AdminListingSummary> {
  const listing = await ProduceListing.findByPk(listingId);
  if (!listing) {
    throw serviceError("Listing not found.", "NOT_FOUND");
  }

  const previousStatus = listing.status ?? "draft";
  const nextStatus = input.action === "hide" ? "paused" : "published";
  await listing.update({ status: nextStatus });

  await recordAdminAudit({
    admin_user_id: adminUserId,
    action:
      input.action === "hide" ? "listing.hide" : "listing.restore",
    entity_type: "produce_listing",
    entity_id: listingId,
    reason: input.reason,
    result: "success",
    metadata: { previous_status: previousStatus, new_status: nextStatus },
  });

  const row = (await ProduceListing.findByPk(listingId, {
    include: listingIncludes,
  })) as
    | (ProduceListing & {
        farmer?: User | null;
        produce_type?: ProduceType | null;
      })
    | null;
  return buildListingSummary(row ?? listing);
}

// ─── Orders ──────────────────────────────────────────────────────────────────

const adminOrderIncludes: Includeable[] = [
  { model: User, as: "buyer", attributes: ["id", "display_name"] },
  { model: User, as: "farmer", attributes: ["id", "display_name"] },
  {
    model: ProduceListing,
    as: "listing",
    attributes: [
      "id",
      "title",
      "status",
      "farmer_user_id",
      "available_quantity",
      "reserved_quantity",
      "sold_quantity",
      "unit",
      "price_per_unit",
      "currency",
      "expiry_date",
    ],
    required: false,
  },
  {
    model: Payment,
    as: "payments",
    separate: true,
    order: [["created_at", "DESC"]],
  },
];

type OrderRow = Parameters<typeof buildOrderData>[0];

export async function listAdminOrders(
  filters: AdminOrdersQuery,
): Promise<{
  orders: OrderData[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}> {
  const where: WhereOptions = {};
  const mutable = where as Record<string, unknown>;
  if (filters.status) mutable.status = filters.status;
  if (filters.payment_status) mutable.payment_status = filters.payment_status;
  if (filters.search) {
    const term = `%${filters.search}%`;
    mutable[Op.or as unknown as string] = [
      { order_number: { [Op.iLike]: term } },
      { "$buyer.display_name$": { [Op.iLike]: term } },
      { "$farmer.display_name$": { [Op.iLike]: term } },
    ];
  }

  const { rows, count } = await Order.findAndCountAll({
    where,
    include: adminOrderIncludes,
    order: [
      ["created_at", "DESC"],
      ["id", "ASC"],
    ],
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit,
    distinct: true,
    subQuery: false,
  });

  const total = Number(count);
  return {
    orders: (rows as unknown as OrderRow[]).map(buildOrderData),
    total,
    page: filters.page,
    limit: filters.limit,
    total_pages: pages(total, filters.limit),
  };
}

export async function getAdminOrder(orderId: string): Promise<OrderData> {
  const order = (await Order.findByPk(orderId, {
    include: adminOrderIncludes,
  })) as unknown as OrderRow | null;
  if (!order) {
    throw serviceError("Order not found.", "NOT_FOUND");
  }
  return buildOrderData(order);
}

// ─── Payments ────────────────────────────────────────────────────────────────

const paymentOrderInclude: Includeable = {
  model: Order,
  as: "order",
  attributes: ["id", "order_number", "buyer_id", "farmer_id"],
  include: [
    { model: User, as: "buyer", attributes: ["id", "display_name"] },
    { model: User, as: "farmer", attributes: ["id", "display_name"] },
  ],
  required: false,
};

interface PaymentOrderRow {
  id: string;
  order_number: string;
  buyer?: User | null;
  farmer?: User | null;
}

function buildPaymentSummary(
  row: Payment & { order?: PaymentOrderRow | null },
): AdminPaymentSummary {
  const amountMinor = Number(row.amount);
  return {
    id: row.id,
    order_id: row.order_id,
    order_number: row.order?.order_number ?? null,
    buyer_display_name: row.order?.buyer?.display_name ?? null,
    farmer_display_name: row.order?.farmer?.display_name ?? null,
    reference: row.reference,
    provider: row.provider ?? "paystack",
    amount_minor: amountMinor,
    amount: amountMinor / 100,
    currency: row.currency,
    status: row.status ?? "pending",
    channel: row.channel ?? null,
    gateway_response: row.gateway_response ?? null,
    paid_at: row.paid_at ?? null,
    verified_at: row.verified_at ?? null,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

export async function listAdminPayments(
  filters: AdminPaymentsQuery,
): Promise<AdminPaymentsData> {
  const where: WhereOptions = {};
  const mutable = where as Record<string, unknown>;
  if (filters.status) mutable.status = filters.status;
  if (filters.search) {
    const term = `%${filters.search}%`;
    mutable[Op.or as unknown as string] = [
      { reference: { [Op.iLike]: term } },
      { "$order.order_number$": { [Op.iLike]: term } },
    ];
  }

  const [result, successful, pending, failed, refunded, successfulAmount] =
    await Promise.all([
      Payment.findAndCountAll({
        where,
        include: [paymentOrderInclude],
        order: [
          ["created_at", "DESC"],
          ["id", "ASC"],
        ],
        limit: filters.limit,
        offset: (filters.page - 1) * filters.limit,
        distinct: true,
        subQuery: false,
      }),
      Payment.count({ where: { status: "success" } }),
      Payment.count({ where: { status: "pending" } }),
      Payment.count({ where: { status: "failed" } }),
      Payment.count({
        where: {
          status: { [Op.in]: ["refunded", "partially_refunded"] },
        },
      }),
      Payment.sum("amount", { where: { status: "success" } }),
    ]);

  const total = Number(result.count);
  return {
    payments: (
      result.rows as Array<Payment & { order?: PaymentOrderRow | null }>
    ).map(buildPaymentSummary),
    total,
    page: filters.page,
    limit: filters.limit,
    total_pages: pages(total, filters.limit),
    summary: {
      successful,
      pending,
      failed,
      refunded,
      successful_amount_minor: Number(successfulAmount ?? 0),
      currency: "NGN",
    },
  };
}

// ─── Audit logs ──────────────────────────────────────────────────────────────

function buildAuditLog(
  row: AdminAuditLog & { admin?: User | null },
): AdminAuditLogData {
  return {
    id: row.id,
    admin_user_id: row.admin_user_id ?? null,
    admin_display_name:
      row.admin?.display_name ?? row.admin?.email ?? null,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id ?? null,
    reason: row.reason ?? null,
    result: row.result ?? null,
    metadata: row.metadata ?? null,
    created_at: row.created_at!,
  };
}

export async function listAdminAuditLogs(
  filters: AdminAuditLogsQuery,
): Promise<PaginatedAdminAuditLogs> {
  const where: WhereOptions = {};
  const mutable = where as Record<string, unknown>;
  if (filters.action) mutable.action = filters.action;
  if (filters.entity_type) mutable.entity_type = filters.entity_type;
  if (filters.admin_user_id) mutable.admin_user_id = filters.admin_user_id;

  const { rows, count } = await AdminAuditLog.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: "admin",
        attributes: ["id", "display_name", "email"],
        required: false,
      },
    ],
    order: [
      ["created_at", "DESC"],
      ["id", "ASC"],
    ],
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit,
    distinct: true,
  });

  const total = Number(count);
  return {
    logs: (rows as Array<AdminAuditLog & { admin?: User | null }>).map(
      buildAuditLog,
    ),
    total,
    page: filters.page,
    limit: filters.limit,
    total_pages: pages(total, filters.limit),
  };
}

// Kept exported for convenience when other modules need the helper.
export { recordAdminAudit };
