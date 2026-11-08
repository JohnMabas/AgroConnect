import type { Includeable, InferAttributes, Transaction } from "sequelize";
import {
  Role,
  TransporterProfile,
  User,
  UserRole,
  sequelize,
} from "../../database/models/index.js";
import type {
  TransporterApprovalStatus,
  TransporterAvailabilityStatus,
} from "../../database/models/transporter-profile.model.js";
import { env } from "../../config/env.js";
import { normalizePhoneNumber } from "../../utils/contact.js";
import type {
  CreateTransporterProfileInput,
  ListAvailableTransportersQuery,
  TransportSuspendInput,
  UpdateTransporterProfileInput,
} from "./transporters.validation.js";
import type {
  PaginatedTransporters,
  TransporterProfileData,
} from "./transporters.types.js";

type TransporterProfileRow = TransporterProfile & {
  user?: User;
  approved_by?: User | null;
};

const transporterIncludes: Includeable[] = [
  {
    model: User,
    as: "user",
    attributes: ["id", "display_name", "status"],
  },
];

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

function normalizePlace(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildProfileData(row: TransporterProfileRow): TransporterProfileData {
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
    availability_status:
      (row.availability_status ??
        "unavailable") as TransporterAvailabilityStatus,
    approval_status:
      (row.approval_status ?? "pending") as TransporterApprovalStatus,
    approved_by_user_id: row.approved_by_user_id ?? null,
    approved_at: row.approved_at ?? null,
    suspended_reason: row.suspended_reason ?? null,
    user: row.user
      ? { id: row.user.id, display_name: row.user.display_name ?? null }
      : undefined,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

async function loadProfileRow(
  id: string,
  transaction?: Transaction,
): Promise<TransporterProfileRow> {
  const row = (await TransporterProfile.findByPk(id, {
    include: transporterIncludes,
    transaction,
  })) as TransporterProfileRow | null;
  if (!row) {
    throw serviceError("Transporter profile not found.", "NOT_FOUND");
  }
  return row;
}

function normalizeContactPhone(value: string): string {
  try {
    const normalized = normalizePhoneNumber(value, env.DEFAULT_PHONE_COUNTRY);
    if (!normalized) {
      throw serviceError("Contact phone is invalid.", "INVALID_OPERATION");
    }
    return normalized;
  } catch (error) {
    if ((error as { code?: string }).code) {
      throw error;
    }
    throw serviceError(
      "Contact phone is invalid. Provide a valid phone number such as +2348031234567.",
      "INVALID_OPERATION",
    );
  }
}

async function ensureTransporterRole(
  userId: string,
  transaction: Transaction,
): Promise<void> {
  const role = await Role.findOne({
    where: { name: "transporter" },
    transaction,
  });
  if (!role) {
    return;
  }

  await UserRole.findOrCreate({
    where: { user_id: userId, role_id: role.id },
    defaults: { user_id: userId, role_id: role.id },
    transaction,
  });
}

export function transporterCoversLocation(
  coverageAreas: string[] | null | undefined,
  location: string,
): boolean {
  if (!coverageAreas || coverageAreas.length === 0) {
    return false;
  }

  const normalizedLocation = normalizePlace(location);
  if (normalizedLocation === "") {
    return false;
  }

  return coverageAreas.some((area) => {
    const normalizedArea = normalizePlace(area);
    if (normalizedArea === "") return false;
    return (
      normalizedLocation.includes(normalizedArea) ||
      normalizedArea.includes(normalizedLocation)
    );
  });
}

export async function createTransporterProfile(
  userId: string,
  input: CreateTransporterProfileInput,
): Promise<TransporterProfileData> {
  if (input.availability_status === "available") {
    throw serviceError(
      "A transporter profile must be approved before it can be marked available.",
      "INVALID_OPERATION",
    );
  }

  const contactPhone = normalizeContactPhone(input.contact_phone);

  const profileId = await sequelize.transaction(async (transaction) => {
    const existing = await TransporterProfile.findOne({
      where: { user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existing) {
      throw serviceError(
        "A transporter profile already exists for this account.",
        "CONFLICT",
      );
    }

    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      throw serviceError("User not found.", "NOT_FOUND");
    }
    if (user.status === "suspended") {
      throw serviceError(
        "A suspended account cannot create a transporter profile.",
        "INVALID_OPERATION",
      );
    }

    const profile = await TransporterProfile.create(
      {
        user_id: userId,
        business_name: input.business_name,
        contact_phone: contactPhone,
        operating_location: input.operating_location,
        coverage_areas: input.coverage_areas,
        vehicle_type: input.vehicle_type ?? null,
        vehicle_registration_number:
          input.vehicle_registration_number ?? null,
        vehicle_capacity: input.vehicle_capacity ?? null,
        produce_types: input.produce_types ?? [],
        availability_status: "unavailable",
        approval_status: "pending",
      },
      { transaction },
    );

    await ensureTransporterRole(userId, transaction);
    return profile.id;
  });

  return buildProfileData(await loadProfileRow(profileId));
}

export async function getMyTransporterProfile(
  userId: string,
): Promise<TransporterProfileData> {
  const row = (await TransporterProfile.findOne({
    where: { user_id: userId },
    include: transporterIncludes,
  })) as TransporterProfileRow | null;
  if (!row) {
    throw serviceError("Transporter profile not found.", "NOT_FOUND");
  }
  return buildProfileData(row);
}

export async function updateTransporterProfile(
  userId: string,
  input: UpdateTransporterProfileInput,
): Promise<TransporterProfileData> {
  const contactPhone = input.contact_phone
    ? normalizeContactPhone(input.contact_phone)
    : undefined;

  const profileId = await sequelize.transaction(async (transaction) => {
    const profile = await TransporterProfile.findOne({
      where: { user_id: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!profile) {
      throw serviceError("Transporter profile not found.", "NOT_FOUND");
    }

    if (profile.approval_status === "suspended") {
      throw serviceError(
        "A suspended transporter profile cannot be updated. Contact an administrator.",
        "INVALID_OPERATION",
      );
    }

    if (
      input.availability_status === "available" &&
      profile.approval_status !== "approved"
    ) {
      throw serviceError(
        "A transporter profile must be approved before it can be marked available.",
        "INVALID_OPERATION",
      );
    }

    const updates: Partial<InferAttributes<TransporterProfile>> = {};
    if (input.business_name !== undefined) {
      updates.business_name = input.business_name;
    }
    if (contactPhone !== undefined) {
      updates.contact_phone = contactPhone;
    }
    if (input.operating_location !== undefined) {
      updates.operating_location = input.operating_location;
    }
    if (input.coverage_areas !== undefined) {
      updates.coverage_areas = input.coverage_areas;
    }
    if (input.vehicle_type !== undefined) {
      updates.vehicle_type = input.vehicle_type;
    }
    if (input.vehicle_registration_number !== undefined) {
      updates.vehicle_registration_number = input.vehicle_registration_number;
    }
    if (input.vehicle_capacity !== undefined) {
      updates.vehicle_capacity = input.vehicle_capacity;
    }
    if (input.produce_types !== undefined) {
      updates.produce_types = input.produce_types;
    }
    if (input.availability_status !== undefined) {
      updates.availability_status = input.availability_status;
    }

    await profile.update(updates, { transaction });
    return profile.id;
  });

  return buildProfileData(await loadProfileRow(profileId));
}

export async function listAvailableTransporters(
  filters: ListAvailableTransportersQuery,
): Promise<PaginatedTransporters> {
  const rows = (await TransporterProfile.findAll({
    where: {
      approval_status: "approved",
      availability_status: "available",
    },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "display_name", "status"],
        required: true,
        where: { status: "active" },
      },
    ],
    order: [
      ["created_at", "DESC"],
      ["id", "ASC"],
    ],
  })) as TransporterProfileRow[];

  const filtered = filters.location
    ? rows.filter((row) =>
        transporterCoversLocation(row.coverage_areas, filters.location!),
      )
    : rows;

  const total = filtered.length;
  const start = (filters.page - 1) * filters.limit;
  const page = filtered.slice(start, start + filters.limit);

  return {
    transporters: page.map(buildProfileData),
    total,
    page: filters.page,
    limit: filters.limit,
    total_pages: total === 0 ? 0 : Math.ceil(total / filters.limit),
  };
}

export async function getTransporterById(
  viewerUserId: string,
  viewerRoles: string[],
  id: string,
): Promise<TransporterProfileData> {
  const row = (await TransporterProfile.findByPk(id, {
    include: transporterIncludes,
  })) as TransporterProfileRow | null;
  if (!row) {
    throw serviceError("Transporter profile not found.", "NOT_FOUND");
  }

  const isAdmin = viewerRoles.includes("admin");
  const isSelf = row.user_id === viewerUserId;
  if (row.approval_status !== "approved" && !isAdmin && !isSelf) {
    throw serviceError("Transporter profile not found.", "NOT_FOUND");
  }

  return buildProfileData(row);
}

async function loadProfileForAdmin(
  id: string,
  transaction: Transaction,
): Promise<TransporterProfile> {
  const profile = await TransporterProfile.findByPk(id, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!profile) {
    throw serviceError("Transporter profile not found.", "NOT_FOUND");
  }
  return profile;
}

export async function approveTransporter(
  adminUserId: string,
  id: string,
): Promise<TransporterProfileData> {
  await sequelize.transaction(async (transaction) => {
    const profile = await loadProfileForAdmin(id, transaction);
    if (profile.approval_status === "approved") {
      return;
    }

    await profile.update(
      {
        approval_status: "approved",
        availability_status: "unavailable",
        approved_by_user_id: adminUserId,
        approved_at: new Date(),
        suspended_reason: null,
      },
      { transaction },
    );
  });

  return buildProfileData(await loadProfileRow(id));
}

export async function suspendTransporter(
  adminUserId: string,
  id: string,
  input: TransportSuspendInput,
): Promise<TransporterProfileData> {
  await sequelize.transaction(async (transaction) => {
    const profile = await loadProfileForAdmin(id, transaction);
    if (profile.approval_status === "suspended") {
      throw serviceError(
        "This transporter is already suspended.",
        "INVALID_OPERATION",
      );
    }

    await profile.update(
      {
        approval_status: "suspended",
        availability_status: "suspended",
        approved_by_user_id: adminUserId,
        suspended_reason: input.reason ?? null,
      },
      { transaction },
    );
  });

  return buildProfileData(await loadProfileRow(id));
}

export async function reactivateTransporter(
  adminUserId: string,
  id: string,
): Promise<TransporterProfileData> {
  await sequelize.transaction(async (transaction) => {
    const profile = await loadProfileForAdmin(id, transaction);
    if (profile.approval_status === "approved") {
      throw serviceError(
        "This transporter is already active.",
        "INVALID_OPERATION",
      );
    }

    await profile.update(
      {
        approval_status: "approved",
        availability_status: "unavailable",
        approved_by_user_id: adminUserId,
        approved_at: new Date(),
        suspended_reason: null,
      },
      { transaction },
    );
  });

  return buildProfileData(await loadProfileRow(id));
}
