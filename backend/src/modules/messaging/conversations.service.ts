import { Op, UniqueConstraintError, type Includeable, type Transaction } from "sequelize";
import {
  BuyerRequest,
  Conversation,
  ConversationParticipant,
  Message,
  ProduceListing,
  User,
  sequelize,
} from "../../database/models/index.js";
import {
  buildMessageData,
  serviceError,
} from "./messaging.helpers.js";
import type { CreateConversationInput, ListConversationsQuery } from "./messaging.validation.js";
import type {
  ConversationData,
  ConversationParticipantData,
  ConversationStatus,
  PaginatedConversations,
} from "./messaging.types.js";

type ConversationRow = Conversation & {
  listing?: ProduceListing;
  buyer_request?: BuyerRequest;
};

type ParticipantRow = ConversationParticipant & { user?: User };

const conversationContextIncludes: Includeable[] = [
  { model: ProduceListing, as: "listing" },
  { model: BuyerRequest, as: "buyer_request" },
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildDedupeKey(
  firstUserId: string,
  secondUserId: string,
  listingId: string | null,
  buyerRequestId: string | null,
): string {
  const sorted = [firstUserId, secondUserId].sort();
  return [
    sorted[0],
    sorted[1],
    listingId ?? "-",
    buyerRequestId ?? "-",
  ].join(":");
}

function buildListingSummary(row: ProduceListing) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    farmer_user_id: row.farmer_user_id,
  };
}

function buildBuyerRequestSummary(row: BuyerRequest) {
  return {
    id: row.id,
    status: row.status,
    buyer_user_id: row.buyer_user_id,
  };
}

async function loadConversationData(
  conversation: ConversationRow,
  userId: string,
  lastReadAt: Date | null,
): Promise<ConversationData> {
  const participantRecords = (await ConversationParticipant.findAll({
    where: { conversation_id: conversation.id },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "display_name"],
      },
    ],
    order: [["created_at", "ASC"]],
  })) as ParticipantRow[];

  const participants: ConversationParticipantData[] = participantRecords.map(
    (record) => ({
      user_id: record.user_id,
      display_name: record.user?.display_name ?? null,
      last_read_at: record.last_read_at ?? null,
      joined_at: record.created_at!,
    }),
  );

  const lastMessage = (await Message.findOne({
    where: { conversation_id: conversation.id },
    include: [
      { model: User, as: "sender", attributes: ["id", "display_name"] },
    ],
    order: [["created_at", "DESC"]],
  })) as (Message & { sender?: User }) | null;

  const unreadWhere: Record<string, unknown> = {
    conversation_id: conversation.id,
    sender_user_id: { [Op.ne]: userId },
  };
  if (lastReadAt) {
    unreadWhere.created_at = { [Op.gt]: lastReadAt };
  }
  const unreadCount = await Message.count({ where: unreadWhere });

  return {
    id: conversation.id,
    created_by_user_id: conversation.created_by_user_id,
    listing_id: conversation.listing_id ?? null,
    buyer_request_id: conversation.buyer_request_id ?? null,
    status: (conversation.status ?? "active") as ConversationStatus,
    last_message_at: conversation.last_message_at ?? null,
    participants,
    listing: conversation.listing
      ? buildListingSummary(conversation.listing)
      : undefined,
    buyer_request: conversation.buyer_request
      ? buildBuyerRequestSummary(conversation.buyer_request)
      : undefined,
    last_message: lastMessage ? buildMessageData(lastMessage) : undefined,
    unread_count: unreadCount,
    created_at: conversation.created_at!,
    updated_at: conversation.updated_at!,
  };
}

async function loadConversationRow(
  id: string,
  transaction?: Transaction,
): Promise<ConversationRow> {
  const conversation = (await Conversation.findByPk(id, {
    include: conversationContextIncludes,
    transaction,
  })) as ConversationRow | null;

  if (!conversation) {
    throw serviceError("Conversation not found.", "NOT_FOUND");
  }

  return conversation;
}

async function assertTargetUser(targetUserId: string): Promise<User> {
  const user = await User.findByPk(targetUserId);
  if (!user) {
    throw serviceError("Recipient not found.", "NOT_FOUND");
  }
  if (user.status === "suspended") {
    throw serviceError(
      "This user is not available for messaging.",
      "INVALID_OPERATION",
    );
  }
  return user;
}

async function validateConversationContext(
  currentUserId: string,
  targetUserId: string,
  listingId: string | null,
  buyerRequestId: string | null,
): Promise<void> {
  let listing: ProduceListing | null = null;
  let buyerRequest: BuyerRequest | null = null;

  if (listingId) {
    listing = await ProduceListing.findByPk(listingId);
    if (!listing) {
      throw serviceError("Listing not found.", "NOT_FOUND");
    }

    if (
      listing.farmer_user_id !== currentUserId &&
      listing.farmer_user_id !== targetUserId
    ) {
      throw serviceError(
        "The conversation must include the listing owner.",
        "INVALID_OPERATION",
      );
    }

    const listingIsAccessible =
      listing.status === "published" &&
      (!listing.expiry_date || listing.expiry_date >= todayIsoDate());

    if (currentUserId !== listing.farmer_user_id && !listingIsAccessible) {
      throw serviceError("Listing not found.", "NOT_FOUND");
    }
  }

  if (buyerRequestId) {
    buyerRequest = await BuyerRequest.findByPk(buyerRequestId);
    if (!buyerRequest) {
      throw serviceError("Buyer request not found.", "NOT_FOUND");
    }

    if (
      buyerRequest.buyer_user_id !== currentUserId &&
      buyerRequest.buyer_user_id !== targetUserId
    ) {
      throw serviceError(
        "The conversation must include the buyer request owner.",
        "INVALID_OPERATION",
      );
    }

    const requestIsAccessible =
      buyerRequest.status === "open" &&
      buyerRequest.expiry_date >= todayIsoDate();

    if (currentUserId !== buyerRequest.buyer_user_id && !requestIsAccessible) {
      throw serviceError("Buyer request not found.", "NOT_FOUND");
    }
  }

  if (listing && buyerRequest) {
    const marketplaceParties = new Set([
      listing.farmer_user_id,
      buyerRequest.buyer_user_id,
    ]);
    const participants = new Set([currentUserId, targetUserId]);

    if (
      marketplaceParties.size !== 2 ||
      participants.size !== 2 ||
      [...marketplaceParties].some((id) => !participants.has(id))
    ) {
      throw serviceError(
        "Participants must be the listing owner and the buyer request owner.",
        "INVALID_OPERATION",
      );
    }
  }
}

export async function createConversation(
  userId: string,
  input: CreateConversationInput,
): Promise<ConversationData> {
  const targetUserId = input.participant_user_id;

  if (targetUserId === userId) {
    throw serviceError(
      "You cannot create a conversation with yourself.",
      "INVALID_OPERATION",
    );
  }

  await assertTargetUser(targetUserId);

  const listingId = input.listing_id ?? null;
  const buyerRequestId = input.buyer_request_id ?? null;

  await validateConversationContext(
    userId,
    targetUserId,
    listingId,
    buyerRequestId,
  );

  const dedupeKey = buildDedupeKey(
    userId,
    targetUserId,
    listingId,
    buyerRequestId,
  );

  const existing = await Conversation.findOne({ where: { dedupe_key: dedupeKey } });
  if (existing) {
    throw serviceError(
      "A conversation already exists for these participants and marketplace context.",
      "DUPLICATE_CONVERSATION",
    );
  }

  let conversationId: string;
  try {
    conversationId = await sequelize.transaction(async (transaction) => {
      const conversation = await Conversation.create(
        {
          created_by_user_id: userId,
          listing_id: listingId,
          buyer_request_id: buyerRequestId,
          status: "active",
          last_message_at: null,
          dedupe_key: dedupeKey,
        },
        { transaction },
      );

      const now = new Date();
      await ConversationParticipant.bulkCreate(
        [
          {
            conversation_id: conversation.id,
            user_id: userId,
            last_read_at: now,
          },
          {
            conversation_id: conversation.id,
            user_id: targetUserId,
            last_read_at: null,
          },
        ],
        { transaction },
      );

      return conversation.id;
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw serviceError(
        "A conversation already exists for these participants and marketplace context.",
        "DUPLICATE_CONVERSATION",
      );
    }
    throw error;
  }

  const conversation = await loadConversationRow(conversationId);
  const participation = await ConversationParticipant.findOne({
    where: { conversation_id: conversationId, user_id: userId },
  });

  return loadConversationData(
    conversation,
    userId,
    participation?.last_read_at ?? null,
  );
}

export async function listConversations(
  userId: string,
  filters: ListConversationsQuery,
): Promise<PaginatedConversations> {
  const statusWhere =
    filters.status === "all" ? undefined : { status: filters.status };

  const { count, rows } = await ConversationParticipant.findAndCountAll({
    where: { user_id: userId },
    include: [
      {
        model: Conversation,
        as: "conversation",
        required: true,
        ...(statusWhere ? { where: statusWhere } : {}),
        include: conversationContextIncludes,
      },
    ],
    order: [
      [{ model: Conversation, as: "conversation" }, "updated_at", "DESC"],
    ],
    limit: filters.limit,
    offset: (filters.page - 1) * filters.limit,
    distinct: true,
  });

  const conversations = await Promise.all(
    (rows as Array<ConversationParticipant & { conversation: ConversationRow }>).map(
      (row) =>
        loadConversationData(
          row.conversation,
          userId,
          row.last_read_at ?? null,
        ),
    ),
  );

  return {
    conversations,
    total: count,
    page: filters.page,
    limit: filters.limit,
    total_pages: Math.ceil(count / filters.limit),
  };
}

export async function getConversationById(
  userId: string,
  id: string,
): Promise<ConversationData> {
  const participation = await ConversationParticipant.findOne({
    where: { conversation_id: id, user_id: userId },
  });
  if (!participation) {
    throw serviceError("Conversation not found.", "NOT_FOUND");
  }

  const conversation = await loadConversationRow(id);
  return loadConversationData(
    conversation,
    userId,
    participation.last_read_at ?? null,
  );
}

async function transitionConversationStatus(
  userId: string,
  id: string,
  action: "archive" | "unarchive" | "block" | "unblock",
): Promise<ConversationData> {
  await sequelize.transaction(async (transaction) => {
    const participation = await ConversationParticipant.findOne({
      where: { conversation_id: id, user_id: userId },
      transaction,
    });
    if (!participation) {
      throw serviceError("Conversation not found.", "NOT_FOUND");
    }

    const conversation = await Conversation.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!conversation) {
      throw serviceError("Conversation not found.", "NOT_FOUND");
    }

    const current = conversation.status ?? "active";

    if (action === "archive") {
      if (current !== "archived") {
        await conversation.update({ status: "archived" }, { transaction });
      }
      return;
    }

    if (action === "unarchive") {
      if (current === "active") return;
      if (current === "blocked") {
        throw serviceError(
          "Unblock the conversation before unarchiving it.",
          "INVALID_OPERATION",
        );
      }
      await conversation.update({ status: "active" }, { transaction });
      return;
    }

    if (action === "block") {
      if (current === "blocked") return;
      if (current === "archived") {
        throw serviceError(
          "Unarchive the conversation before blocking it.",
          "INVALID_OPERATION",
        );
      }
      await conversation.update({ status: "blocked" }, { transaction });
      return;
    }

    if (action === "unblock") {
      if (current === "active") return;
      if (current === "archived") {
        throw serviceError(
          "Unarchive the conversation before unblocking it.",
          "INVALID_OPERATION",
        );
      }
      await conversation.update({ status: "active" }, { transaction });
    }
  });

  return getConversationById(userId, id);
}

export async function archiveConversation(
  userId: string,
  id: string,
): Promise<ConversationData> {
  return transitionConversationStatus(userId, id, "archive");
}

export async function unarchiveConversation(
  userId: string,
  id: string,
): Promise<ConversationData> {
  return transitionConversationStatus(userId, id, "unarchive");
}

export async function blockConversation(
  userId: string,
  id: string,
): Promise<ConversationData> {
  return transitionConversationStatus(userId, id, "block");
}

export async function unblockConversation(
  userId: string,
  id: string,
): Promise<ConversationData> {
  return transitionConversationStatus(userId, id, "unblock");
}
