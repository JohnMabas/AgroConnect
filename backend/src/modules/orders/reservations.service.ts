import { Op, QueryTypes, type Transaction } from "sequelize";
import { env } from "../../config/env.js";
import {
  InventoryReservation,
  Order,
  Payment,
  ProduceListing,
  sequelize,
} from "../../database/models/index.js";
import type { ReservationStatus } from "../../database/models/inventory-reservation.model.js";
import {
  addDecimal,
  normalizeDecimal,
  subtractDecimal,
} from "../listings/decimal.js";
import { publishOrderExpired, recordOrderEvent } from "./orders.events.js";
import type { OrderReservationData } from "./orders.types.js";

const QUANTITY_SCALE = 3;

function serviceError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isProduceFresh(listing: ProduceListing): boolean {
  return !listing.expiry_date || listing.expiry_date >= todayIsoDate();
}

function isListingActive(listing: ProduceListing): boolean {
  return listing.status === "published" || listing.status === "sold_out";
}

export function buildReservationData(
  row: InventoryReservation,
): OrderReservationData {
  return {
    id: row.id,
    order_id: row.order_id,
    listing_id: row.listing_id,
    quantity: Number(row.quantity),
    status: (row.status ?? "active") as ReservationStatus,
    expires_at: row.expires_at,
    released_at: row.released_at ?? null,
    release_reason: row.release_reason ?? null,
    is_expired: new Date(row.expires_at).getTime() <= Date.now(),
  };
}

export async function reserveInventoryForOrder(
  order: Order,
  listing: ProduceListing,
  transaction: Transaction,
): Promise<InventoryReservation> {
  const quantity = normalizeDecimal(order.quantity, QUANTITY_SCALE);
  const available = normalizeDecimal(listing.available_quantity, QUANTITY_SCALE);
  const reserved = normalizeDecimal(listing.reserved_quantity, QUANTITY_SCALE);
  const newAvailable = subtractDecimal(available, quantity, QUANTITY_SCALE);
  const newReserved = addDecimal(reserved, quantity, QUANTITY_SCALE);

  if (newAvailable.startsWith("-")) {
    throw serviceError(
      "The requested quantity exceeds the listing's available quantity.",
      "INVALID_OPERATION",
    );
  }

  const updated = await sequelize.query<{ id: string }>(
    `UPDATE produce_listings
     SET available_quantity = :newAvailable::numeric,
         reserved_quantity = :newReserved::numeric,
         status = CASE
           WHEN :newAvailable::numeric = 0 AND status = 'published' THEN 'sold_out'
           ELSE status
         END,
         updated_at = NOW()
     WHERE id = :listingId
       AND status = 'published'
       AND available_quantity = :expectedAvailable::numeric
     RETURNING id`,
    {
      replacements: {
        listingId: listing.id,
        newAvailable,
        newReserved,
        expectedAvailable: available,
      },
      transaction,
      type: QueryTypes.SELECT,
    },
  );

  if (updated.length === 0) {
    throw serviceError(
      "The listing's available inventory changed. Please retry the order.",
      "INVALID_OPERATION",
    );
  }

  return InventoryReservation.create(
    {
      order_id: order.id,
      listing_id: listing.id,
      quantity: quantity as unknown as number,
      status: "active",
      expires_at: order.reservation_expires_at ?? new Date(),
    },
    { transaction },
  );
}

async function lockActiveReservation(
  orderId: string,
  transaction: Transaction,
): Promise<InventoryReservation | null> {
  return InventoryReservation.findOne({
    where: { order_id: orderId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

export async function releaseReservationForOrder(
  order: Order,
  reason: string,
  transaction: Transaction,
): Promise<InventoryReservation | null> {
  const reservation = await lockActiveReservation(order.id, transaction);
  if (!reservation || reservation.status !== "active") {
    return null;
  }

  const listing = await ProduceListing.findByPk(reservation.listing_id, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!listing) {
    throw serviceError("Listing not found for reservation.", "INVALID_OPERATION");
  }

  const quantity = normalizeDecimal(reservation.quantity, QUANTITY_SCALE);
  const restorable = isProduceFresh(listing) && isListingActive(listing);

  if (restorable) {
    const updated = await sequelize.query<{ id: string }>(
      `UPDATE produce_listings
       SET available_quantity = available_quantity + :quantity::numeric,
           reserved_quantity = reserved_quantity - :quantity::numeric,
           status = CASE
             WHEN status = 'sold_out'
               AND available_quantity + :quantity::numeric > 0
               THEN 'published'
             ELSE status
           END,
           updated_at = NOW()
       WHERE id = :listingId
         AND reserved_quantity >= :quantity::numeric
       RETURNING id`,
      {
        replacements: { listingId: listing.id, quantity },
        transaction,
        type: QueryTypes.SELECT,
      },
    );

    if (updated.length === 0) {
      throw serviceError(
        "The reservation could not be released.",
        "INVALID_OPERATION",
      );
    }
  } else {
    const updated = await sequelize.query<{ id: string }>(
      `UPDATE produce_listings
       SET reserved_quantity = reserved_quantity - :quantity::numeric,
           quantity = quantity - :quantity::numeric,
           status = CASE
             WHEN expiry_date IS NOT NULL
               AND expiry_date < CURRENT_DATE
               AND status IN ('published', 'sold_out')
               THEN 'expired'
             WHEN status = 'published' AND available_quantity = 0
               THEN 'sold_out'
             ELSE status
           END,
           updated_at = NOW()
       WHERE id = :listingId
         AND reserved_quantity >= :quantity::numeric
         AND quantity >= :quantity::numeric
       RETURNING id`,
      {
        replacements: { listingId: listing.id, quantity },
        transaction,
        type: QueryTypes.SELECT,
      },
    );

    if (updated.length === 0) {
      throw serviceError(
        "The reservation could not be removed from inventory.",
        "INVALID_OPERATION",
      );
    }
  }

  await reservation.update(
    {
      status:
        reason === "reservation_expired" ? "expired" : "released",
      released_at: new Date(),
      release_reason: restorable
        ? reason
        : `${reason}:stock_removed_produce_expired_or_listing_inactive`,
    },
    { transaction },
  );

  return reservation;
}

export async function consumeReservationForOrder(
  order: Order,
  transaction: Transaction,
): Promise<InventoryReservation | null> {
  const reservation = await lockActiveReservation(order.id, transaction);
  if (!reservation) {
    return null;
  }
  if (reservation.status === "consumed") {
    return reservation;
  }
  if (reservation.status !== "active") {
    return null;
  }

  const listing = await ProduceListing.findByPk(reservation.listing_id, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!listing) {
    throw serviceError("Listing not found for reservation.", "INVALID_OPERATION");
  }

  const quantity = normalizeDecimal(reservation.quantity, QUANTITY_SCALE);
  const updated = await sequelize.query<{ id: string }>(
    `UPDATE produce_listings
     SET reserved_quantity = reserved_quantity - :quantity::numeric,
         sold_quantity = sold_quantity + :quantity::numeric,
         updated_at = NOW()
     WHERE id = :listingId
       AND reserved_quantity >= :quantity::numeric
     RETURNING id`,
    {
      replacements: { listingId: listing.id, quantity },
      transaction,
      type: QueryTypes.SELECT,
    },
  );

  if (updated.length === 0) {
    throw serviceError(
      "The reservation could not be consumed.",
      "INVALID_OPERATION",
    );
  }

  await reservation.update(
    {
      status: "consumed",
      released_at: new Date(),
      release_reason: "payment_confirmed",
    },
    { transaction },
  );

  return reservation;
}

export async function restoreConsumedReservationForRefund(
  order: Order,
  transaction: Transaction,
): Promise<InventoryReservation | null> {
  const reservation = await lockActiveReservation(order.id, transaction);
  if (!reservation || reservation.status !== "consumed") {
    return null;
  }

  const listing = await ProduceListing.findByPk(reservation.listing_id, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!listing) {
    return null;
  }

  const quantity = normalizeDecimal(reservation.quantity, QUANTITY_SCALE);
  const restorable = isProduceFresh(listing) && isListingActive(listing);

  if (restorable) {
    await sequelize.query(
      `UPDATE produce_listings
       SET sold_quantity = sold_quantity - :quantity::numeric,
           available_quantity = available_quantity + :quantity::numeric,
           status = CASE
             WHEN status = 'sold_out'
               AND available_quantity + :quantity::numeric > 0
               THEN 'published'
             ELSE status
           END,
           updated_at = NOW()
       WHERE id = :listingId
         AND sold_quantity >= :quantity::numeric`,
      {
        replacements: { listingId: listing.id, quantity },
        transaction,
      },
    );
  } else {
    await sequelize.query(
      `UPDATE produce_listings
       SET sold_quantity = sold_quantity - :quantity::numeric,
           quantity = quantity - :quantity::numeric,
           status = CASE
             WHEN expiry_date IS NOT NULL
               AND expiry_date < CURRENT_DATE
               AND status IN ('published', 'sold_out')
               THEN 'expired'
             ELSE status
           END,
           updated_at = NOW()
       WHERE id = :listingId
         AND sold_quantity >= :quantity::numeric
         AND quantity >= :quantity::numeric`,
      {
        replacements: { listingId: listing.id, quantity },
        transaction,
      },
    );
  }

  await reservation.update(
    {
      status: "released",
      released_at: new Date(),
      release_reason: restorable
        ? "refund_restored"
        : "refund_stock_removed_produce_expired_or_listing_inactive",
    },
    { transaction },
  );

  return reservation;
}

export async function expireReservations(limit = 100): Promise<number> {
  const now = new Date();
  const candidates = await InventoryReservation.findAll({
    where: {
      status: "active",
      expires_at: { [Op.lte]: now },
    },
    attributes: ["id", "order_id"],
    order: [["expires_at", "ASC"]],
    limit,
  });

  let expired = 0;

  for (const candidate of candidates) {
    const didExpire = await sequelize.transaction(async (transaction) => {
      const order = await Order.findByPk(candidate.order_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!order) {
        return false;
      }

      const reservation = await InventoryReservation.findByPk(candidate.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (
        !reservation ||
        reservation.status !== "active" ||
        new Date(reservation.expires_at).getTime() > Date.now()
      ) {
        return false;
      }

      if (
        order.payment_status === "paid" ||
        ["paid", "processing", "ready_for_delivery", "in_transit", "delivered", "completed", "refunded"].includes(
          order.status ?? "",
        )
      ) {
        await consumeReservationForOrder(order, transaction);
        return false;
      }

      const released = await releaseReservationForOrder(
        order,
        "reservation_expired",
        transaction,
      );
      if (!released) {
        return false;
      }

      const previousStatus = order.status ?? "pending_payment";
      await order.update(
        {
          status: "cancelled",
          cancelled_at: new Date(),
          cancellation_reason: "Reservation expired before payment was confirmed.",
        },
        { transaction },
      );
      await Payment.update(
        { status: "abandoned" },
        {
          where: { order_id: order.id, status: "pending" },
          transaction,
        },
      );
      await recordOrderEvent(
        order.id,
        "reservation_expired",
        null,
        previousStatus,
        "cancelled",
        {
          reservation_id: released.id,
          release_reason: released.release_reason,
        },
        transaction,
      );

      return true;
    });

    if (didExpire) {
      expired += 1;
      publishOrderExpired(candidate.order_id, "reservation_expired");
    }
  }

  return expired;
}

let expiryTimer: NodeJS.Timeout | undefined;

export function startReservationExpiryJob(): void {
  if (expiryTimer) return;

  const run = (): void => {
    void expireReservations().catch((error: unknown) => {
      console.error("Reservation expiry sweep failed:", error);
    });
  };

  run();
  expiryTimer = setInterval(
    run,
    env.ORDER_RESERVATION_SWEEP_INTERVAL_SECONDS * 1000,
  );
  expiryTimer.unref();
}

export function stopReservationExpiryJob(): void {
  if (expiryTimer) {
    clearInterval(expiryTimer);
    expiryTimer = undefined;
  }
}
