import { createHash } from "node:crypto";
import path from "node:path";
import {
  Op,
  UniqueConstraintError,
  type Includeable,
  type Transaction,
  type WhereOptions,
} from "sequelize";
import { env } from "../../config/env.js";
import {
  CooperativeProfile,
  Delivery,
  EmailVerificationToken,
  FarmerProfile,
  Order,
  PhoneOtp,
  TransporterProfile,
  User,
  Verification,
  VerificationDocument,
  VerificationHistory,
  sequelize,
} from "../../database/models/index.js";
import type { VerificationDocumentType } from "../../database/models/verification-document.model.js";
import type {
  VerificationStatus,
  VerificationType,
} from "../../database/models/verification.model.js";
import { privateDocumentStorage } from "../../integrations/storage/index.js";
import { notifyAdmins } from "../../services/admin-users.service.js";
import {
  cleanOptionalText,
  sanitizeSingleLineText,
} from "../../utils/plain-text.js";
import { getReviewSummary } from "../reviews/reviews.service.js";
import type { UserTrustProfile } from "../reviews/reviews.types.js";
import { dispatchNotification } from "../notifications/notifications.service.js";
import { detectVerificationDocument } from "./verification-document-validation.js";
import type {
  ListVerificationsQuerySchema,
  UploadVerificationDocumentSchema,
} from "./verifications.validation.js";
import type { z } from "zod";
import type {
  PaginatedVerifications,
  VerificationData,
  VerificationDetail,
  VerificationDocumentData,
  VerificationHistoryData,
  VerificationIndicator,
  VerificationStatusOverview,
} from "./verifications.types.js";

type ListVerificationsQuery = z.infer<typeof ListVerificationsQuerySchema>;
type UploadVerificationDocumentInput = z.infer<
  typeof UploadVerificationDocumentSchema
>;
type ManualVerificationType =
  | "farmer_identity"
  | "buyer_business"
  | "transporter"
  | "cooperative";

const MANUAL_TYPES: ManualVerificationType[] = [
  "farmer_identity",
  "buyer_business",
  "transporter",
  "cooperative",
];

const ALL_TYPES: VerificationType[] = [
  "phone",
  "email",
  "farmer_identity",
  "buyer_business",
  "transporter",
  "cooperative",
];

const TYPE_LABELS: Record<VerificationType, string> = {
  phone: "Phone number",
  email: "Email address",
  farmer_identity: "Farmer identity",
  buyer_business: "Buyer business",
  transporter: "Transporter",
  cooperative: "Cooperative",
};

const MAX_DOCUMENTS_PER_VERIFICATION = 10;

type VerificationRow = Verification & {
  user?: User;
  reviewed_by_user?: User;
  documents?: VerificationDocument[];
};

type VerificationDocumentRow = VerificationDocument & {
  verification?: Verification;
};

type VerificationHistoryRow = VerificationHistory & {
  actor?: User;
};

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

async function safeNotify(input: Parameters<typeof dispatchNotification>[0]) {
  try {
    await dispatchNotification(input);
  } catch (error) {
    console.error("Verification notification dispatch failed:", error);
  }
}

function verificationUserSummary(user: User | undefined) {
  if (!user) return undefined;
  return {
    id: user.id,
    display_name: user.display_name ?? null,
    email: user.email ?? null,
    phone_number: user.phone_number ?? null,
    status: user.status ?? "pending",
  };
}

export function buildVerificationData(row: VerificationRow): VerificationData {
  return {
    id: row.id,
    user_id: row.user_id,
    verification_type: row.verification_type,
    status: row.status ?? "not_submitted",
    submitted_at: row.submitted_at ?? null,
    reviewed_at: row.reviewed_at ?? null,
    reviewed_by: row.reviewed_by ?? null,
    rejection_reason: row.rejection_reason ?? null,
    expiry_date: row.expiry_date ?? null,
    documents_count: row.documents?.length ?? 0,
    user: verificationUserSummary(row.user),
    reviewed_by_user: row.reviewed_by_user
      ? {
          id: row.reviewed_by_user.id,
          display_name: row.reviewed_by_user.display_name ?? null,
        }
      : undefined,
    documents: row.documents?.map(buildDocumentData),
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

function buildDocumentData(
  row: VerificationDocument,
): VerificationDocumentData {
  return {
    id: row.id,
    verification_id: row.verification_id,
    document_type: row.document_type,
    original_file_name: row.original_file_name,
    mime_type: row.mime_type,
    file_size_bytes: Number(row.file_size_bytes),
    checksum_sha256: row.checksum_sha256 ?? null,
    created_at: row.created_at!,
  };
}

function buildHistoryData(row: VerificationHistoryRow): VerificationHistoryData {
  return {
    id: row.id,
    verification_id: row.verification_id,
    actor_user_id: row.actor_user_id ?? null,
    action: row.action,
    previous_status: row.previous_status ?? null,
    new_status: row.new_status,
    reason: row.reason ?? null,
    metadata: row.metadata ?? null,
    actor: row.actor
      ? {
          id: row.actor.id,
          display_name: row.actor.display_name ?? null,
        }
      : undefined,
    created_at: row.created_at!,
  };
}

const verificationIncludes: Includeable[] = [
  {
    model: User,
    as: "user",
    attributes: ["id", "display_name", "email", "phone_number", "status"],
  },
  {
    model: User,
    as: "reviewed_by_user",
    attributes: ["id", "display_name"],
  },
  {
    model: VerificationDocument,
    as: "documents",
    separate: true,
    order: [["created_at", "ASC"]],
  },
];

function paginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
}

async function syncProfileVerificationStatus(
  verification: Verification,
  status: VerificationStatus,
  transaction?: Transaction,
): Promise<void> {
  if (verification.verification_type === "farmer_identity") {
    const profileStatus =
      status === "approved"
        ? "verified"
        : status === "pending"
          ? "pending"
          : status === "rejected"
            ? "rejected"
            : "unverified";
    await FarmerProfile.update(
      { verification_status: profileStatus },
      { where: { user_id: verification.user_id }, transaction },
    );
    return;
  }

  if (verification.verification_type === "transporter") {
    const profileStatus =
      status === "approved"
        ? "approved"
        : status === "pending"
          ? "pending"
          : "rejected";
    await TransporterProfile.update(
      { approval_status: profileStatus },
      { where: { user_id: verification.user_id }, transaction },
    );
    return;
  }

  if (verification.verification_type === "cooperative") {
    const profileStatus =
      status === "approved"
        ? "approved"
        : status === "pending"
          ? "pending"
          : "rejected";
    await CooperativeProfile.update(
      { verification_status: profileStatus },
      { where: { registered_by_user_id: verification.user_id }, transaction },
    );
  }
}

async function addHistory(
  verificationId: string,
  actorUserId: string | null,
  action: "submitted" | "approved" | "rejected" | "expired",
  previousStatus: string | null,
  newStatus: string,
  reason: string | null,
  transaction?: Transaction,
): Promise<VerificationHistory> {
  return VerificationHistory.create(
    {
      verification_id: verificationId,
      actor_user_id: actorUserId,
      action,
      previous_status: previousStatus,
      new_status: newStatus,
      reason,
      metadata: { verification_type_action: action },
    },
    { transaction },
  );
}

async function getVerificationRow(
  id: string,
  transaction?: Transaction,
): Promise<VerificationRow> {
  const row = (await Verification.findByPk(id, {
    include: verificationIncludes,
    transaction,
  })) as VerificationRow | null;
  if (!row) {
    throw serviceError("Verification not found.", "NOT_FOUND");
  }
  return row;
}

export async function expirePendingVerifications(where?: {
  id?: string;
  user_id?: string;
}): Promise<number> {
  const now = new Date();
  const rows = await Verification.findAll({
    where: {
      ...(where ?? {}),
      status: "pending",
      expiry_date: { [Op.ne]: null, [Op.lte]: now },
    },
  });

  for (const row of rows) {
    await sequelize.transaction(async (transaction) => {
      const locked = await Verification.findByPk(row.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (
        !locked ||
        locked.status !== "pending" ||
        !locked.expiry_date ||
        locked.expiry_date > now
      ) {
        return;
      }

      await locked.update({ status: "expired" }, { transaction });
      await addHistory(
        locked.id,
        null,
        "expired",
        "pending",
        "expired",
        "Verification request expired.",
        transaction,
      );
      await syncProfileVerificationStatus(locked, "expired", transaction);
    });
  }

  return rows.length;
}

export async function submitVerification(
  userId: string,
  verificationType: ManualVerificationType,
): Promise<VerificationDetail> {
  const user = await User.findByPk(userId, { attributes: ["id", "display_name"] });
  if (!user) {
    throw serviceError("User not found.", "NOT_FOUND");
  }

  let verificationId: string;
  let historyId: string;
  let previousStatus: VerificationStatus | null = null;

  try {
    const result = await sequelize.transaction(async (transaction) => {
      let row = await Verification.findOne({
        where: { user_id: userId, verification_type: verificationType },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (row?.status === "pending") {
        throw serviceError(
          "A verification request of this type is already pending.",
          "CONFLICT",
        );
      }
      if (row?.status === "approved") {
        throw serviceError(
          "This verification type is already approved.",
          "CONFLICT",
        );
      }

      previousStatus = row?.status ?? null;
      const now = new Date();
      const expiryDate = new Date(
        now.getTime() + env.VERIFICATION_REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      );

      if (!row) {
        row = await Verification.create(
          {
            user_id: userId,
            verification_type: verificationType,
            status: "pending",
            submitted_at: now,
            expiry_date: expiryDate,
          },
          { transaction },
        );
      } else {
        await row.update(
          {
            status: "pending",
            submitted_at: now,
            reviewed_at: null,
            reviewed_by: null,
            rejection_reason: null,
            expiry_date: expiryDate,
          },
          { transaction },
        );
      }

      const history = await addHistory(
        row.id,
        userId,
        "submitted",
        previousStatus,
        "pending",
        null,
        transaction,
      );

      await syncProfileVerificationStatus(row, "pending", transaction);

      return { row, history };
    });

    verificationId = result.row.id;
    historyId = result.history.id;
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw serviceError(
        "A verification request of this type already exists.",
        "CONFLICT",
      );
    }
    throw error;
  }

  await safeNotify({
    user_id: userId,
    notification_type: "verification_submitted",
    variables: { verification_type: verificationType },
    related_entity_type: "verification",
    related_entity_id: verificationId,
    action_url: `/verifications/${verificationId}`,
    dedupe_key: `verification:submitted:user:${historyId}`,
  });

  await notifyAdmins({
    notification_type: "verification_submitted",
    variables: {
      actor_name: user.display_name ?? null,
      verification_type: verificationType,
    },
    related_entity_type: "verification",
    related_entity_id: verificationId,
    action_url: `/admin/verifications/${verificationId}`,
    dedupe_key_prefix: `verification:submitted:admin:${historyId}`,
  });

  return getVerificationDetail(verificationId, userId, false);
}

export async function getVerificationDetail(
  verificationId: string,
  viewerUserId: string,
  isAdmin: boolean,
): Promise<VerificationDetail> {
  await expirePendingVerifications({ id: verificationId });
  const row = await getVerificationRow(verificationId);

  if (!isAdmin && row.user_id !== viewerUserId) {
    throw serviceError("Verification not found.", "NOT_FOUND");
  }

  const historyRows = await VerificationHistory.findAll({
    where: { verification_id: verificationId },
    include: [{ model: User, as: "actor", attributes: ["id", "display_name"] }],
    order: [["created_at", "ASC"]],
  });

  return {
    ...buildVerificationData(row),
    history: (historyRows as VerificationHistoryRow[]).map(buildHistoryData),
  };
}

async function hasVerifiedContact(
  userId: string,
  type: "phone" | "email",
): Promise<boolean> {
  if (type === "phone") {
    return (
      (await PhoneOtp.count({ where: { user_id: userId, used: true } })) > 0
    );
  }
  return (
    (await EmailVerificationToken.count({
      where: { user_id: userId, used: true },
    })) > 0
  );
}

export async function getMyVerificationStatus(
  userId: string,
): Promise<VerificationStatusOverview> {
  await expirePendingVerifications({ user_id: userId });

  const [user, requests, phoneVerified, emailVerified] = await Promise.all([
    User.findByPk(userId, {
      attributes: ["id", "phone_number", "email", "status"],
    }),
    Verification.findAll({
      where: { user_id: userId },
      include: verificationIncludes,
      order: [["created_at", "DESC"]],
    }) as unknown as Promise<VerificationRow[]>,
    hasVerifiedContact(userId, "phone"),
    hasVerifiedContact(userId, "email"),
  ]);

  if (!user) {
    throw serviceError("User not found.", "NOT_FOUND");
  }

  const byType = new Map(
    requests.map((request) => [request.verification_type, request]),
  );

  const indicators: VerificationIndicator[] = ALL_TYPES.map((type) => {
    if (type === "phone") {
      const verified = Boolean(user.phone_number) && phoneVerified;
      return {
        verification_type: type,
        label: TYPE_LABELS[type],
        status: verified ? "approved" : "not_submitted",
        verified_at: null,
        rejected_reason: null,
      };
    }
    if (type === "email") {
      const verified = Boolean(user.email) && emailVerified;
      return {
        verification_type: type,
        label: TYPE_LABELS[type],
        status: verified ? "approved" : "not_submitted",
        verified_at: null,
        rejected_reason: null,
      };
    }

    const row = byType.get(type);
    return {
      verification_type: type,
      label: TYPE_LABELS[type],
      status: (row?.status ?? "not_submitted") as VerificationStatus,
      verified_at: row?.status === "approved" ? row.reviewed_at ?? null : null,
      rejected_reason: row?.rejection_reason ?? null,
    };
  });

  return {
    user_id: userId,
    phone_number_verified: Boolean(user.phone_number) && phoneVerified,
    email_verified: Boolean(user.email) && emailVerified,
    indicators,
    requests: requests.map(buildVerificationData),
  };
}

export async function addVerificationDocument(
  userId: string,
  verificationId: string,
  file: Express.Multer.File,
  input: UploadVerificationDocumentInput,
): Promise<VerificationDocumentData> {
  const detected = detectVerificationDocument(file.buffer);
  if (!detected) {
    throw serviceError(
      "Unsupported document type. Upload a PDF, JPEG, PNG or WebP file.",
      "INVALID_OPERATION",
    );
  }

  const row = await Verification.findByPk(verificationId);
  if (!row || row.user_id !== userId) {
    throw serviceError("Verification not found.", "NOT_FOUND");
  }
  if (!MANUAL_TYPES.includes(row.verification_type as ManualVerificationType)) {
    throw serviceError(
      "Documents are not required for this verification type.",
      "INVALID_OPERATION",
    );
  }
  if (row.status !== "pending") {
    throw serviceError(
      "Documents can only be added to a pending verification.",
      "INVALID_OPERATION",
    );
  }

  const existingCount = await VerificationDocument.count({
    where: { verification_id: verificationId },
  });
  if (existingCount >= MAX_DOCUMENTS_PER_VERIFICATION) {
    throw serviceError(
      `A verification can have at most ${MAX_DOCUMENTS_PER_VERIFICATION} documents.`,
      "INVALID_OPERATION",
    );
  }

  const originalFileName =
    sanitizeSingleLineText(path.basename(file.originalname)).slice(0, 255) ||
    `verification-document.${detected.extension}`;
  const checksum = createHash("sha256").update(file.buffer).digest("hex");

  const stored = await privateDocumentStorage.saveDocument({
    verificationId,
    buffer: file.buffer,
    extension: detected.extension,
  });

  try {
    const created = await sequelize.transaction(async (transaction) => {
      const locked = await Verification.findByPk(verificationId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!locked || locked.user_id !== userId || locked.status !== "pending") {
        throw serviceError("Verification not found.", "NOT_FOUND");
      }

      const count = await VerificationDocument.count({
        where: { verification_id: verificationId },
        transaction,
      });
      if (count >= MAX_DOCUMENTS_PER_VERIFICATION) {
        throw serviceError(
          `A verification can have at most ${MAX_DOCUMENTS_PER_VERIFICATION} documents.`,
          "INVALID_OPERATION",
        );
      }

      return VerificationDocument.create(
        {
          verification_id: verificationId,
          uploaded_by_user_id: userId,
          document_type: input.document_type as VerificationDocumentType,
          original_file_name: originalFileName,
          storage_key: stored.storageKey,
          mime_type: detected.mimeType,
          file_size_bytes: file.size,
          checksum_sha256: checksum,
        },
        { transaction },
      );
    });

    return buildDocumentData(created);
  } catch (error) {
    await privateDocumentStorage
      .deleteDocument(stored.storageKey)
      .catch((cleanupError) =>
        console.error("Failed to clean up orphaned document:", cleanupError),
      );
    throw error;
  }
}

export async function deleteVerificationDocument(
  userId: string,
  verificationId: string,
  documentId: string,
): Promise<void> {
  const verification = await Verification.findByPk(verificationId);
  if (!verification || verification.user_id !== userId) {
    throw serviceError("Verification not found.", "NOT_FOUND");
  }
  if (verification.status !== "pending") {
    throw serviceError(
      "Documents can only be removed from a pending verification.",
      "INVALID_OPERATION",
    );
  }

  const document = await VerificationDocument.findOne({
    where: { id: documentId, verification_id: verificationId },
  });
  if (!document) {
    throw serviceError("Verification document not found.", "NOT_FOUND");
  }

  await document.destroy();
  await privateDocumentStorage
    .deleteDocument(document.storage_key)
    .catch((error) =>
      console.error("Failed to delete verification document file:", error),
    );
}

export async function downloadVerificationDocument(
  userId: string,
  verificationId: string,
  documentId: string,
  isAdmin: boolean,
): Promise<{
  buffer: Buffer;
  mimeType: string;
  originalFileName: string;
}> {
  const document = (await VerificationDocument.findOne({
    where: { id: documentId, verification_id: verificationId },
    include: [{ model: Verification, as: "verification" }],
  })) as VerificationDocumentRow | null;

  if (!document || !document.verification) {
    throw serviceError("Verification document not found.", "NOT_FOUND");
  }
  if (!isAdmin && document.verification.user_id !== userId) {
    throw serviceError("Verification document not found.", "NOT_FOUND");
  }

  try {
    return {
      buffer: await privateDocumentStorage.readDocument(document.storage_key),
      mimeType: document.mime_type,
      originalFileName: document.original_file_name,
    };
  } catch (error) {
    console.error("Failed to read verification document:", error);
    throw serviceError(
      "The verification document could not be retrieved.",
      "STORAGE_ERROR",
    );
  }
}

export async function adminListVerifications(
  query: ListVerificationsQuery,
): Promise<PaginatedVerifications> {
  await expirePendingVerifications();

  const where: WhereOptions<Verification> = {};
  if (query.status) where.status = query.status;
  if (query.verification_type) {
    where.verification_type = query.verification_type;
  }
  if (query.user_id) where.user_id = query.user_id;

  const { rows, count } = await Verification.findAndCountAll({
    where,
    include: verificationIncludes,
    order: [["created_at", "DESC"]],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
    distinct: true,
  });

  return {
    verifications: (rows as VerificationRow[]).map(buildVerificationData),
    ...paginationMeta(count, query.page, query.limit),
  };
}

export async function adminApproveVerification(
  adminId: string,
  verificationId: string,
  note: string | null | undefined,
): Promise<VerificationDetail> {
  await expirePendingVerifications({ id: verificationId });

  const documentCount = await VerificationDocument.count({
    where: { verification_id: verificationId },
  });

  const cleanedNote = cleanOptionalText(note);

  const outcome = await sequelize.transaction(async (transaction) => {
    const row = await Verification.findByPk(verificationId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!row) {
      throw serviceError("Verification not found.", "NOT_FOUND");
    }
    if (row.status !== "pending") {
      throw serviceError(
        "Only a pending verification can be approved.",
        "INVALID_OPERATION",
      );
    }
    if (documentCount === 0) {
      throw serviceError(
        "At least one supporting document is required before approval.",
        "INVALID_OPERATION",
      );
    }

    await row.update(
      {
        status: "approved",
        reviewed_at: new Date(),
        reviewed_by: adminId,
        rejection_reason: null,
      },
      { transaction },
    );
    const history = await addHistory(
      row.id,
      adminId,
      "approved",
      "pending",
      "approved",
      cleanedNote,
      transaction,
    );
    await syncProfileVerificationStatus(row, "approved", transaction);

    return {
      historyId: history.id,
      userId: row.user_id,
      verificationType: row.verification_type,
    };
  });

  await safeNotify({
    user_id: outcome.userId,
    notification_type: "verification_approved",
    variables: {
      verification_type: outcome.verificationType,
      reason: cleanedNote,
    },
    related_entity_type: "verification",
    related_entity_id: verificationId,
    action_url: `/verifications/${verificationId}`,
    dedupe_key: `verification:approved:${outcome.historyId}`,
  });

  return getVerificationDetail(verificationId, adminId, true);
}

export async function adminRejectVerification(
  adminId: string,
  verificationId: string,
  reasonInput: string,
): Promise<VerificationDetail> {
  await expirePendingVerifications({ id: verificationId });
  const reason = cleanOptionalText(reasonInput) ?? "Verification rejected.";

  const outcome = await sequelize.transaction(async (transaction) => {
    const row = await Verification.findByPk(verificationId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!row) {
      throw serviceError("Verification not found.", "NOT_FOUND");
    }
    if (row.status !== "pending") {
      throw serviceError(
        "Only a pending verification can be rejected.",
        "INVALID_OPERATION",
      );
    }

    await row.update(
      {
        status: "rejected",
        reviewed_at: new Date(),
        reviewed_by: adminId,
        rejection_reason: reason,
      },
      { transaction },
    );
    const history = await addHistory(
      row.id,
      adminId,
      "rejected",
      "pending",
      "rejected",
      reason,
      transaction,
    );
    await syncProfileVerificationStatus(row, "rejected", transaction);

    return {
      historyId: history.id,
      userId: row.user_id,
      verificationType: row.verification_type,
    };
  });

  await safeNotify({
    user_id: outcome.userId,
    notification_type: "verification_rejected",
    variables: {
      verification_type: outcome.verificationType,
      reason,
    },
    related_entity_type: "verification",
    related_entity_id: verificationId,
    action_url: `/verifications/${verificationId}`,
    dedupe_key: `verification:rejected:${outcome.historyId}`,
  });

  return getVerificationDetail(verificationId, adminId, true);
}

export async function getTrustProfile(
  userId: string,
): Promise<UserTrustProfile> {
  const user = await User.findByPk(userId, {
    attributes: ["id", "display_name", "status", "created_at"],
  });
  if (!user) {
    throw serviceError("User not found.", "NOT_FOUND");
  }

  await expirePendingVerifications({ user_id: userId });

  const [ratings, requests, completedOrders, completedDeliveries, phoneVerified, emailVerified] =
    await Promise.all([
      getReviewSummary(userId),
      Verification.findAll({
        where: { user_id: userId },
        attributes: [
          "id",
          "verification_type",
          "status",
          "reviewed_at",
          "rejection_reason",
        ],
      }) as unknown as Promise<Verification[]>,
      Order.count({
        where: {
          status: "completed",
          [Op.or]: [{ buyer_id: userId }, { farmer_id: userId }],
        },
      }),
      Delivery.count({
        where: { transporter_id: userId, status: "completed" },
      }),
      hasVerifiedContact(userId, "phone"),
      hasVerifiedContact(userId, "email"),
    ]);

  const byType = new Map(
    requests.map((request) => [request.verification_type, request]),
  );
  const indicators: VerificationIndicator[] = ALL_TYPES.map((type) => {
    if (type === "phone") {
      return {
        verification_type: type,
        label: TYPE_LABELS[type],
        status: phoneVerified ? "approved" : "not_submitted",
        verified_at: null,
        rejected_reason: null,
      };
    }
    if (type === "email") {
      return {
        verification_type: type,
        label: TYPE_LABELS[type],
        status: emailVerified ? "approved" : "not_submitted",
        verified_at: null,
        rejected_reason: null,
      };
    }
    const row = byType.get(type);
    return {
      verification_type: type,
      label: TYPE_LABELS[type],
      status: (row?.status ?? "not_submitted") as VerificationStatus,
      verified_at: row?.status === "approved" ? row.reviewed_at ?? null : null,
      rejected_reason: row?.rejection_reason ?? null,
    };
  });

  const hasApprovedIdentity = indicators.some(
    (indicator) =>
      MANUAL_TYPES.includes(
        indicator.verification_type as ManualVerificationType,
      ) && indicator.status === "approved",
  );

  return {
    user: {
      id: user.id,
      display_name: user.display_name ?? null,
      member_since: user.created_at!,
      account_status: user.status ?? "pending",
    },
    ratings,
    verification_indicators: indicators,
    completed_orders: completedOrders,
    completed_deliveries_as_transporter: completedDeliveries,
    has_verified_contact: phoneVerified || emailVerified,
    has_approved_identity: hasApprovedIdentity,
  };
}

