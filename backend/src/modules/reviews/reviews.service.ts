import {
  Op,
  UniqueConstraintError,
  col,
  fn,
  type Includeable,
  type Transaction,
  type WhereOptions,
} from "sequelize";
import { env } from "../../config/env.js";
import {
  Delivery,
  Order,
  Review,
  ReviewHistory,
  ReviewReport,
  User,
  sequelize,
} from "../../database/models/index.js";
import type {
  ReviewReportReason,
  ReviewReportStatus,
} from "../../database/models/review-report.model.js";
import { notifyAdmins } from "../../services/admin-users.service.js";
import { dispatchNotification } from "../notifications/notifications.service.js";
import {
  cleanOptionalSingleLine,
  cleanOptionalText,
  sanitizePlainText,
} from "../../utils/plain-text.js";
import type {
  AdminListReportsQuerySchema,
  AdminListReviewsQuerySchema,
  CreateReviewSchema,
  HideReviewSchema,
  ListMyReviewsQuerySchema,
  ListUserReviewsQuerySchema,
  ReportReviewSchema,
  UpdateReportStatusSchema,
  UpdateReviewSchema,
} from "./reviews.validation.js";
import type { z } from "zod";
import type {
  AdminReviewDetail,
  PaginatedReviewReports,
  PaginatedReviews,
  ReviewData,
  ReviewHistoryData,
  ReviewReportData,
  ReviewSummary,
} from "./reviews.types.js";

type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
type UpdateReviewInput = z.infer<typeof UpdateReviewSchema>;
type ListUserReviewsQuery = z.infer<typeof ListUserReviewsQuerySchema>;
type ListMyReviewsQuery = z.infer<typeof ListMyReviewsQuerySchema>;
type ReportReviewInput = z.infer<typeof ReportReviewSchema>;
type AdminListReviewsQuery = z.infer<typeof AdminListReviewsQuerySchema>;
type AdminListReportsQuery = z.infer<typeof AdminListReportsQuerySchema>;
type UpdateReportStatusInput = z.infer<typeof UpdateReportStatusSchema>;
type HideReviewInput = z.infer<typeof HideReviewSchema>;

type ReviewRow = Review & {
  reviewer?: User;
  reviewed_user?: User;
  order?: Order;
  delivery?: Delivery | null;
};

type ReviewReportRow = ReviewReport & {
  reporter?: User;
  reviewed_by_user?: User;
  review?: ReviewRow;
};

type ReviewHistoryRow = ReviewHistory & {
  actor?: User;
};

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

function paginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
}

function userSummary(user: User | undefined | null) {
  if (!user) return undefined;
  return {
    id: user.id,
    display_name: user.display_name ?? null,
  };
}

const reviewIncludes: Includeable[] = [
  {
    model: User,
    as: "reviewer",
    attributes: ["id", "display_name"],
  },
  {
    model: User,
    as: "reviewed_user",
    attributes: ["id", "display_name"],
  },
  {
    model: Order,
    as: "order",
    attributes: ["id", "order_number", "status"],
  },
  {
    model: Delivery,
    as: "delivery",
    attributes: ["id", "delivery_reference", "status", "transporter_id"],
    required: false,
  },
];

export function buildReviewData(row: ReviewRow): ReviewData {
  return {
    id: row.id,
    reviewer_id: row.reviewer_id,
    reviewed_user_id: row.reviewed_user_id,
    order_id: row.order_id,
    delivery_id: row.delivery_id ?? null,
    rating: Number(row.rating),
    review_title: row.review_title ?? null,
    review_comment: row.review_comment ?? null,
    is_hidden: row.is_hidden ?? false,
    hidden_reason: row.hidden_reason ?? null,
    hidden_by_user_id: row.hidden_by_user_id ?? null,
    hidden_at: row.hidden_at ?? null,
    edited_at: row.edited_at ?? null,
    reviewer: userSummary(row.reviewer),
    reviewed_user: userSummary(row.reviewed_user),
    order: row.order
      ? {
          id: row.order.id,
          order_number: row.order.order_number,
          status: row.order.status ?? "pending_payment",
        }
      : undefined,
    delivery: row.delivery
      ? {
          id: row.delivery.id,
          delivery_reference: row.delivery.delivery_reference,
          status: row.delivery.status ?? "pending",
          transporter_id: row.delivery.transporter_id ?? null,
        }
      : null,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

function buildReportData(row: ReviewReportRow): ReviewReportData {
  return {
    id: row.id,
    review_id: row.review_id,
    reporter_id: row.reporter_id,
    reason: row.reason,
    description: row.description ?? null,
    status: row.status ?? "pending",
    reviewed_by: row.reviewed_by ?? null,
    resolution_note: row.resolution_note ?? null,
    reporter: userSummary(row.reporter),
    reviewed_by_user: userSummary(row.reviewed_by_user),
    review: row.review ? buildReviewData(row.review) : undefined,
    created_at: row.created_at!,
    updated_at: row.updated_at!,
  };
}

function buildHistoryData(row: ReviewHistoryRow): ReviewHistoryData {
  return {
    id: row.id,
    review_id: row.review_id,
    report_id: row.report_id ?? null,
    actor_user_id: row.actor_user_id ?? null,
    action: row.action,
    previous_rating: row.previous_rating ?? null,
    new_rating: row.new_rating ?? null,
    previous_title: row.previous_title ?? null,
    new_title: row.new_title ?? null,
    previous_comment: row.previous_comment ?? null,
    new_comment: row.new_comment ?? null,
    note: row.note ?? null,
    metadata: row.metadata ?? null,
    actor: userSummary(row.actor),
    created_at: row.created_at!,
  };
}

function reviewOrderFor(
  sort: ListUserReviewsQuery["sort"],
): Array<[string, string]> {
  switch (sort) {
    case "oldest":
      return [["created_at", "ASC"]];
    case "highest":
      return [
        ["rating", "DESC"],
        ["created_at", "DESC"],
      ];
    case "lowest":
      return [
        ["rating", "ASC"],
        ["created_at", "DESC"],
      ];
    case "newest":
    default:
      return [["created_at", "DESC"]];
  }
}

async function getReviewRow(
  id: string,
  transaction?: Transaction,
): Promise<ReviewRow> {
  const row = (await Review.findByPk(id, {
    include: reviewIncludes,
    transaction,
  })) as ReviewRow | null;
  if (!row) {
    throw serviceError("Review not found.", "NOT_FOUND");
  }
  return row;
}

export async function getReviewById(
  id: string,
  viewerUserId?: string,
  isAdmin = false,
): Promise<ReviewData> {
  const row = await getReviewRow(id);
  if (row.is_hidden && !isAdmin && row.reviewer_id !== viewerUserId) {
    throw serviceError("Review not found.", "NOT_FOUND");
  }
  return buildReviewData(row);
}

async function resolveReviewTarget(
  reviewerId: string,
  input: CreateReviewInput,
  transaction: Transaction,
): Promise<{
  order: Order;
  delivery: Delivery | null;
  reviewedUserId: string;
}> {
  const order = await Order.findByPk(input.order_id, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!order || (order.buyer_id !== reviewerId && order.farmer_id !== reviewerId)) {
    throw serviceError("Order not found.", "NOT_FOUND");
  }

  let delivery: Delivery | null = null;
  let reviewedUserId: string;

  if (input.delivery_id) {
    delivery = await Delivery.findByPk(input.delivery_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (
      !delivery ||
      delivery.order_id !== order.id ||
      (delivery.buyer_id !== reviewerId && delivery.farmer_id !== reviewerId)
    ) {
      throw serviceError("Delivery not found.", "NOT_FOUND");
    }
    if (delivery.status !== "completed") {
      throw serviceError(
        "A transporter can only be reviewed after the delivery is completed.",
        "INVALID_OPERATION",
      );
    }
    if (!delivery.transporter_id) {
      throw serviceError(
        "This delivery has no assigned transporter to review.",
        "INVALID_OPERATION",
      );
    }
    reviewedUserId = delivery.transporter_id;
  } else {
    if (order.status !== "completed") {
      throw serviceError(
        "This order can only be reviewed after it is completed.",
        "INVALID_OPERATION",
      );
    }
    reviewedUserId =
      reviewerId === order.buyer_id ? order.farmer_id : order.buyer_id;
  }

  if (input.reviewed_user_id && input.reviewed_user_id !== reviewedUserId) {
    throw serviceError(
      "The reviewed user does not match this transaction.",
      "INVALID_OPERATION",
    );
  }
  if (reviewedUserId === reviewerId) {
    throw serviceError("You cannot review yourself.", "INVALID_OPERATION");
  }

  const reviewedUser = await User.findByPk(reviewedUserId, { transaction });
  if (!reviewedUser) {
    throw serviceError("Reviewed user not found.", "NOT_FOUND");
  }

  return { order, delivery, reviewedUserId };
}

async function safeNotify(input: Parameters<typeof dispatchNotification>[0]) {
  try {
    await dispatchNotification(input);
  } catch (error) {
    console.error("Review notification dispatch failed:", error);
  }
}

export async function createReview(
  reviewerId: string,
  input: CreateReviewInput,
): Promise<ReviewData> {
  const title = cleanOptionalSingleLine(input.review_title);
  const comment = cleanOptionalText(input.review_comment);

  let reviewId: string;
  let reviewedUserId: string;
  let reviewerName: string | null;
  let orderNumber: string;
  let deliveryReference: string | null;

  try {
    const result = await sequelize.transaction(async (transaction) => {
      const target = await resolveReviewTarget(reviewerId, input, transaction);
      const reviewer = await User.findByPk(reviewerId, {
        attributes: ["id", "display_name"],
        transaction,
      });

      const review = await Review.create(
        {
          reviewer_id: reviewerId,
          reviewed_user_id: target.reviewedUserId,
          order_id: target.order.id,
          delivery_id: target.delivery?.id ?? null,
          rating: input.rating,
          review_title: title,
          review_comment: comment,
        },
        { transaction },
      );

      await ReviewHistory.create(
        {
          review_id: review.id,
          actor_user_id: reviewerId,
          action: "created",
          new_rating: input.rating,
          new_title: title,
          new_comment: comment,
        },
        { transaction },
      );

      return {
        review,
        reviewedUserId: target.reviewedUserId,
        reviewerName: reviewer?.display_name ?? null,
        orderNumber: target.order.order_number,
        deliveryReference: target.delivery?.delivery_reference ?? null,
      };
    });

    reviewId = result.review.id;
    reviewedUserId = result.reviewedUserId;
    reviewerName = result.reviewerName;
    orderNumber = result.orderNumber;
    deliveryReference = result.deliveryReference;
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw serviceError(
        "You have already reviewed this transaction.",
        "CONFLICT",
      );
    }
    throw error;
  }

  await safeNotify({
    user_id: reviewedUserId,
    notification_type: "new_review",
    variables: {
      actor_name: reviewerName,
      rating: input.rating,
      review_title: title,
      order_number: orderNumber,
      delivery_reference: deliveryReference,
    },
    related_entity_type: "review",
    related_entity_id: reviewId,
    action_url: `/reviews/${reviewId}`,
    dedupe_key: `review:new:${reviewId}`,
  });

  return getReviewById(reviewId, reviewerId);
}

export async function listReviewsForUser(
  userId: string,
  query: ListUserReviewsQuery,
): Promise<PaginatedReviews> {
  const user = await User.findByPk(userId, { attributes: ["id"] });
  if (!user) {
    throw serviceError("User not found.", "NOT_FOUND");
  }

  const where: WhereOptions<Review> = {
    reviewed_user_id: userId,
    is_hidden: false,
  };
  if (query.rating !== undefined) {
    where.rating = query.rating;
  }

  const { rows, count } = await Review.findAndCountAll({
    where,
    include: reviewIncludes,
    order: reviewOrderFor(query.sort),
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
    distinct: true,
  });

  return {
    reviews: (rows as ReviewRow[]).map(buildReviewData),
    ...paginationMeta(count, query.page, query.limit),
  };
}

export async function listMyReviews(
  userId: string,
  query: ListMyReviewsQuery,
): Promise<PaginatedReviews> {
  const { rows, count } = await Review.findAndCountAll({
    where: { reviewer_id: userId },
    include: reviewIncludes,
    order: reviewOrderFor(query.sort),
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
    distinct: true,
  });

  return {
    reviews: (rows as ReviewRow[]).map(buildReviewData),
    ...paginationMeta(count, query.page, query.limit),
  };
}

export async function getReviewSummary(userId: string): Promise<ReviewSummary> {
  const user = await User.findByPk(userId, { attributes: ["id"] });
  if (!user) {
    throw serviceError("User not found.", "NOT_FOUND");
  }

  const [rows, reviewsWithComments] = await Promise.all([
    Review.findAll({
      attributes: ["rating", [fn("COUNT", col("id")), "count"]],
      where: { reviewed_user_id: userId, is_hidden: false },
      group: ["rating"],
      raw: true,
    }) as unknown as Promise<Array<{ rating: number; count: string }>>,
    Review.count({
      where: {
        reviewed_user_id: userId,
        is_hidden: false,
        review_comment: { [Op.ne]: null },
      },
    }),
  ]);

  const ratingDistribution: ReviewSummary["rating_distribution"] = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };

  let total = 0;
  let weighted = 0;
  for (const row of rows) {
    const rating = Number(row.rating) as 1 | 2 | 3 | 4 | 5;
    const count = Number(row.count);
    ratingDistribution[String(rating) as "1" | "2" | "3" | "4" | "5"] = count;
    total += count;
    weighted += rating * count;
  }

  return {
    user_id: userId,
    total_reviews: total,
    average_rating: total > 0 ? Math.round((weighted / total) * 100) / 100 : 0,
    rating_distribution: ratingDistribution,
    five_star_reviews: ratingDistribution["5"],
    reviews_with_comments: reviewsWithComments,
  };
}

export async function updateReview(
  reviewerId: string,
  reviewId: string,
  input: UpdateReviewInput,
): Promise<ReviewData> {
  const row = await getReviewRow(reviewId);
  if (row.reviewer_id !== reviewerId) {
    throw serviceError("Review not found.", "NOT_FOUND");
  }
  if (row.is_hidden) {
    throw serviceError("A hidden review cannot be edited.", "INVALID_OPERATION");
  }

  const editDeadline =
    row.created_at!.getTime() + env.REVIEW_EDIT_WINDOW_MINUTES * 60 * 1000;
  if (Date.now() > editDeadline) {
    throw serviceError(
      `Reviews can only be edited within ${env.REVIEW_EDIT_WINDOW_MINUTES} minutes of creation.`,
      "INVALID_OPERATION",
    );
  }

  const nextTitle =
    input.review_title === undefined
      ? row.review_title
      : cleanOptionalSingleLine(input.review_title);
  const nextComment =
    input.review_comment === undefined
      ? row.review_comment
      : cleanOptionalText(input.review_comment);
  const nextRating = input.rating ?? Number(row.rating);

  await sequelize.transaction(async (transaction) => {
    await row.update(
      {
        rating: nextRating,
        review_title: nextTitle,
        review_comment: nextComment,
        edited_at: new Date(),
      },
      { transaction },
    );

    await ReviewHistory.create(
      {
        review_id: row.id,
        actor_user_id: reviewerId,
        action: "edited",
        previous_rating: Number(row.previous("rating") ?? row.rating),
        new_rating: nextRating,
        previous_title: row.previous("review_title") ?? null,
        new_title: nextTitle,
        previous_comment: row.previous("review_comment") ?? null,
        new_comment: nextComment,
      },
      { transaction },
    );
  });

  return getReviewById(reviewId, reviewerId);
}

export async function reportReview(
  reporterId: string,
  reviewId: string,
  input: ReportReviewInput,
): Promise<ReviewReportData> {
  const row = await getReviewRow(reviewId);
  if (row.reviewer_id === reporterId) {
    throw serviceError("You cannot report your own review.", "INVALID_OPERATION");
  }
  if (row.is_hidden) {
    throw serviceError("Review not found.", "NOT_FOUND");
  }

  const description = cleanOptionalText(input.description);

  let report: ReviewReport;
  try {
    report = await sequelize.transaction(async (transaction) => {
      const created = await ReviewReport.create(
        {
          review_id: row.id,
          reporter_id: reporterId,
          reason: input.reason,
          description,
        },
        { transaction },
      );

      await ReviewHistory.create(
        {
          review_id: row.id,
          report_id: created.id,
          actor_user_id: reporterId,
          action: "reported",
          note: description,
          metadata: { reason: input.reason },
        },
        { transaction },
      );

      return created;
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw serviceError(
        "You have already reported this review.",
        "CONFLICT",
      );
    }
    throw error;
  }

  const reporter = await User.findByPk(reporterId, {
    attributes: ["id", "display_name"],
  });

  await notifyAdmins({
    notification_type: "review_reported",
    variables: {
      actor_name: reporter?.display_name ?? null,
      report_reason: input.reason,
      review_title: row.review_title ?? null,
    },
    related_entity_type: "review_report",
    related_entity_id: report.id,
    action_url: `/admin/reports/${report.id}`,
    dedupe_key_prefix: `review:reported:${report.id}`,
  });

  return buildReportData({
    ...(report.get({ plain: true }) as ReviewReport),
    reporter: reporter ?? undefined,
  } as ReviewReportRow);
}

export async function listUserReviewsForUser(
  userId: string,
  query: ListUserReviewsQuery,
): Promise<PaginatedReviews> {
  return listReviewsForUser(userId, query);
}

export async function adminListReviews(
  query: AdminListReviewsQuery,
): Promise<PaginatedReviews> {
  const where: WhereOptions<Review> = {};
  if (query.user_id) where.reviewed_user_id = query.user_id;
  if (query.reviewer_id) where.reviewer_id = query.reviewer_id;
  if (query.order_id) where.order_id = query.order_id;
  if (query.hidden !== undefined) where.is_hidden = query.hidden;
  if (query.min_rating !== undefined || query.max_rating !== undefined) {
    where.rating = {
      ...(query.min_rating !== undefined ? { [Op.gte]: query.min_rating } : {}),
      ...(query.max_rating !== undefined ? { [Op.lte]: query.max_rating } : {}),
    };
  }

  const { rows, count } = await Review.findAndCountAll({
    where,
    include: reviewIncludes,
    order: reviewOrderFor(query.sort),
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
    distinct: true,
  });

  return {
    reviews: (rows as ReviewRow[]).map(buildReviewData),
    ...paginationMeta(count, query.page, query.limit),
  };
}

export async function adminGetReviewDetail(
  reviewId: string,
): Promise<AdminReviewDetail> {
  const review = await getReviewRow(reviewId);

  const [historyRows, reportRows] = await Promise.all([
    ReviewHistory.findAll({
      where: { review_id: reviewId },
      include: [{ model: User, as: "actor", attributes: ["id", "display_name"] }],
      order: [["created_at", "ASC"]],
    }),
    ReviewReport.findAll({
      where: { review_id: reviewId },
      include: [
        { model: User, as: "reporter", attributes: ["id", "display_name"] },
        {
          model: User,
          as: "reviewed_by_user",
          attributes: ["id", "display_name"],
        },
      ],
      order: [["created_at", "DESC"]],
    }),
  ]);

  return {
    review: buildReviewData(review),
    history: (historyRows as ReviewHistoryRow[]).map(buildHistoryData),
    reports: (reportRows as ReviewReportRow[]).map(buildReportData),
  };
}

export async function adminHideReview(
  adminId: string,
  reviewId: string,
  input: HideReviewInput,
): Promise<ReviewData> {
  const row = await getReviewRow(reviewId);
  if (row.is_hidden) {
    throw serviceError("Review is already hidden.", "INVALID_OPERATION");
  }
  const reason = sanitizePlainText(input.reason);
  const now = new Date();

  const history = await sequelize.transaction(async (transaction) => {
    await row.update(
      {
        is_hidden: true,
        hidden_reason: reason,
        hidden_by_user_id: adminId,
        hidden_at: now,
      },
      { transaction },
    );
    return ReviewHistory.create(
      {
        review_id: row.id,
        actor_user_id: adminId,
        action: "hidden",
        note: reason,
      },
      { transaction },
    );
  });

  await safeNotify({
    user_id: row.reviewer_id,
    notification_type: "review_hidden",
    variables: {
      review_title: row.review_title ?? null,
      reason,
    },
    related_entity_type: "review",
    related_entity_id: row.id,
    action_url: `/reviews/${row.id}`,
    dedupe_key: `review:hidden:${history.id}`,
  });

  return getReviewById(reviewId, adminId, true);
}

export async function adminRestoreReview(
  adminId: string,
  reviewId: string,
): Promise<ReviewData> {
  const row = await getReviewRow(reviewId);
  if (!row.is_hidden) {
    throw serviceError("Review is not hidden.", "INVALID_OPERATION");
  }

  const history = await sequelize.transaction(async (transaction) => {
    await row.update(
      {
        is_hidden: false,
        hidden_reason: null,
        hidden_by_user_id: null,
        hidden_at: null,
      },
      { transaction },
    );
    return ReviewHistory.create(
      {
        review_id: row.id,
        actor_user_id: adminId,
        action: "restored",
      },
      { transaction },
    );
  });

  await safeNotify({
    user_id: row.reviewer_id,
    notification_type: "review_restored",
    variables: { review_title: row.review_title ?? null },
    related_entity_type: "review",
    related_entity_id: row.id,
    action_url: `/reviews/${row.id}`,
    dedupe_key: `review:restored:${history.id}`,
  });

  return getReviewById(reviewId, adminId, true);
}

function reportWhere(query: AdminListReportsQuery): WhereOptions<ReviewReport> {
  const where: WhereOptions<ReviewReport> = {};
  if (query.status) where.status = query.status;
  if (query.reason) where.reason = query.reason;
  if (query.review_id) where.review_id = query.review_id;
  if (query.reporter_id) where.reporter_id = query.reporter_id;
  return where;
}

const reportIncludes: Includeable[] = [
  { model: User, as: "reporter", attributes: ["id", "display_name"] },
  {
    model: User,
    as: "reviewed_by_user",
    attributes: ["id", "display_name"],
  },
  { model: Review, as: "review", include: reviewIncludes },
];

export async function adminListReports(
  query: AdminListReportsQuery,
): Promise<PaginatedReviewReports> {
  const { rows, count } = await ReviewReport.findAndCountAll({
    where: reportWhere(query),
    include: reportIncludes,
    order: [["created_at", "DESC"]],
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
    distinct: true,
  });

  return {
    reports: (rows as ReviewReportRow[]).map(buildReportData),
    ...paginationMeta(count, query.page, query.limit),
  };
}

export async function adminGetReport(
  reportId: string,
): Promise<ReviewReportData> {
  const row = (await ReviewReport.findByPk(reportId, {
    include: reportIncludes,
  })) as ReviewReportRow | null;
  if (!row) {
    throw serviceError("Review report not found.", "NOT_FOUND");
  }
  return buildReportData(row);
}

export async function adminUpdateReportStatus(
  adminId: string,
  reportId: string,
  input: UpdateReportStatusInput,
): Promise<ReviewReportData> {
  const row = (await ReviewReport.findByPk(reportId, {
    include: reportIncludes,
  })) as ReviewReportRow | null;
  if (!row) {
    throw serviceError("Review report not found.", "NOT_FOUND");
  }
  if (row.status === input.status) {
    throw serviceError(
      `Report is already ${input.status.replaceAll("_", " ")}.`,
      "INVALID_OPERATION",
    );
  }

  const status: ReviewReportStatus = input.status;
  const note =
    input.resolution_note === undefined
      ? row.resolution_note
      : cleanOptionalText(input.resolution_note);

  const history = await sequelize.transaction(async (transaction) => {
    await row.update(
      {
        status,
        reviewed_by: adminId,
        resolution_note: note,
      },
      { transaction },
    );

    return ReviewHistory.create(
      {
        review_id: row.review_id,
        report_id: row.id,
        actor_user_id: adminId,
        action: "report_status_changed",
        note,
        metadata: { status },
      },
      { transaction },
    );
  });

  if (status === "resolved" || status === "dismissed") {
    await safeNotify({
      user_id: row.reporter_id,
      notification_type:
        status === "resolved"
          ? "review_report_resolved"
          : "review_report_dismissed",
      variables: { reason: note },
      related_entity_type: "review_report",
      related_entity_id: row.id,
      action_url: `/reviews/${row.review_id}`,
      dedupe_key: `review:report:${status}:${history.id}`,
    });
  }

  return adminGetReport(reportId);
}

export type {
  AdminListReportsQuery,
  AdminListReviewsQuery,
  CreateReviewInput,
  HideReviewInput,
  ListMyReviewsQuery,
  ListUserReviewsQuery,
  ReportReviewInput,
  ReviewReportReason,
  UpdateReportStatusInput,
  UpdateReviewInput,
};
