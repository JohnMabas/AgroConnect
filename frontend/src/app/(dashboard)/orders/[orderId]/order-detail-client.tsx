"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { CardSkeleton, LineSkeleton } from "@/components/dashboard/skeleton";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  ApiError,
  ordersApi,
  paymentsApi,
  type OrderData,
  type OrderEventData,
  type OrderFeeDisclosureData,
  type OrderPaymentSummary,
  type OrderPaymentStatus,
  type OrderReservationData,
  type OrderStatus,
  type PaymentStatus,
  type RefundData,
} from "@/lib/api";

type StatusUpdate = Extract<
  OrderStatus,
  "processing" | "ready_for_delivery" | "in_transit" | "delivered" | "completed"
>;

interface RefundRecord extends RefundData {
  payment_reference: string;
}

interface OrderSecondaryData {
  events: OrderEventData[];
  reservation: OrderReservationData | null;
  payments: OrderPaymentSummary[];
  fees: OrderFeeDisclosureData[];
  refunds: RefundRecord[];
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  processing: "Processing",
  ready_for_delivery: "Ready for delivery",
  in_transit: "In transit",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  payment_failed: "Payment failed",
  refunded: "Refunded",
};

const PAYMENT_LABEL: Record<OrderPaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

const REFUND_LABEL: Record<RefundData["status"], string> = {
  pending: "Pending",
  processing: "Processing",
  processed: "Processed",
  failed: "Failed",
  needs_attention: "Needs attention",
};

const FEE_LABEL: Record<OrderFeeDisclosureData["fee_type"], string> = {
  cooperative_service_fee: "Cooperative service fee",
  agent_service_fee: "Agent service fee",
  platform_commission: "Platform commission",
  other: "Other fee",
};

const FARMER_TRANSITIONS: Array<{
  from: OrderStatus;
  to: Exclude<StatusUpdate, "completed">;
  label: string;
}> = [
  { from: "paid", to: "processing", label: "Start processing" },
  { from: "processing", to: "ready_for_delivery", label: "Mark ready for delivery" },
  { from: "ready_for_delivery", to: "in_transit", label: "Mark in transit" },
  { from: "in_transit", to: "delivered", label: "Mark delivered" },
];

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

function settledValue<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}

function formatMoney(value: number, currency: string): string {
  if (currency === "NGN") return `₦${value.toLocaleString()}`;
  return `${currency} ${value.toLocaleString()}`;
}

function formatMinor(value: string, currency: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `${currency} ${value}`;
  return formatMoney(numeric / 100, currency);
}

function formatDateTime(value: string | null): string {
  if (!value) return "Not recorded";
  try {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusText(value: string | null): string {
  if (!value) return "—";
  if (value in STATUS_LABEL) return STATUS_LABEL[value as OrderStatus];
  return value.replace(/_/g, " ");
}

function orderBadgeClass(status: OrderStatus): string {
  if (status === "paid" || status === "delivered" || status === "completed") {
    return "bg-fresh-green/15 text-agro-green";
  }
  if (status === "pending_payment" || status === "payment_failed") {
    return "bg-harvest-gold/15 text-amber-700";
  }
  if (status === "cancelled" || status === "refunded") {
    return "bg-red-50 text-red-600";
  }
  return "bg-deep-navy/8 text-deep-navy/60";
}

function paymentBadgeClass(status: PaymentStatus | OrderPaymentStatus): string {
  if (status === "paid" || status === "success") return "bg-fresh-green/15 text-agro-green";
  if (status === "pending") return "bg-harvest-gold/15 text-amber-700";
  if (status === "partially_refunded") return "bg-blue-50 text-blue-700";
  return "bg-red-50 text-red-600";
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-deep-navy/45">{label}</dt>
      <dd className="mt-1 text-sm text-deep-navy/80">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-deep-navy/55">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <LineSkeleton width="w-72" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={4} />
        </div>
        <CardSkeleton lines={6} />
      </div>
    </div>
  );
}

export default function OrderDetailClient({ orderId }: { orderId: string }) {
  const { token, user, loading: authLoading, error: authError } = useDashboardAuth();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [secondary, setSecondary] = useState<OrderSecondaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const loadOrderData = useCallback(
    async (accessToken: string, id: string) => {
      const orderResponse = await ordersApi.get(accessToken, id);
      const loadedOrder = orderResponse.data.order;

      const [historyResult, reservationResult, paymentsResult, feesResult] =
        await Promise.allSettled([
          ordersApi.history(accessToken, id),
          ordersApi.reservation(accessToken, id),
          ordersApi.payments(accessToken, id),
          ordersApi.feeDisclosures(accessToken, id),
        ]);

      const payments = settledValue(paymentsResult)?.data.payments ?? [];
      const refundResults = await Promise.allSettled(
        payments
          .filter((payment) => payment.status === "success" && payment.reference)
          .map(async (payment) => {
            const response = await paymentsApi.getRefunds(accessToken, payment.reference);
            return response.data.refunds.map((refund) => ({
              ...refund,
              payment_reference: payment.reference,
            }));
          }),
      );

      return {
        order: loadedOrder,
        events: settledValue(historyResult)?.data.history.events ?? [],
        reservation: settledValue(reservationResult)?.data.reservation ?? null,
        payments,
        fees: settledValue(feesResult)?.data.fee_disclosures ?? [],
        refunds: refundResults.flatMap((result) => settledValue(result) ?? []),
      };
    },
    [],
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    void loadOrderData(token, orderId)
      .then((data) => {
        if (!active) return;
        setOrder(data.order);
        setSecondary(data);
        setError("");
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(errorMessage(err, "Unable to load this order."));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, orderId, retryKey, loadOrderData]);

  async function refresh(accessToken: string) {
    const refreshed = await loadOrderData(accessToken, orderId);
    setOrder(refreshed.order);
    setSecondary(refreshed);
  }

  function retry() {
    setError("");
    setLoading(true);
    setRetryKey((value) => value + 1);
  }

  async function handleStatusUpdate(next: StatusUpdate) {
    if (!token || !order) return;
    setActionBusy(true);
    setActionError("");
    setActionNotice("");
    try {
      const response = await ordersApi.updateStatus(token, order.id, next);
      setOrder(response.data.order);
      await refresh(token);
      setActionNotice(`Order moved to ${STATUS_LABEL[next]}.`);
    } catch (err) {
      setActionError(errorMessage(err, "Unable to update this order."));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !order || !cancelReason.trim()) {
      setActionError("Enter a reason before cancelling this order.");
      return;
    }
    setActionBusy(true);
    setActionError("");
    setActionNotice("");
    try {
      const response = await ordersApi.cancel(token, order.id, cancelReason.trim());
      setOrder(response.data.order);
      setCancelOpen(false);
      setCancelReason("");
      await refresh(token);
      setActionNotice("Order cancelled.");
    } catch (err) {
      setActionError(errorMessage(err, "Unable to cancel this order."));
    } finally {
      setActionBusy(false);
    }
  }

  if (authLoading || loading) return <DetailSkeleton />;

  if (authError) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-red-700">{authError}</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-agro-green hover:underline">
          Return to login
        </Link>
      </div>
    );
  }

  if (!token) {
    return <p className="py-12 text-center text-sm text-deep-navy/60">Redirecting to sign in…</p>;
  }

  if (error || !order || !secondary) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h1 className="font-heading text-lg font-bold text-deep-navy">Order unavailable</h1>
        <p className="mt-2 text-sm text-red-700">{error || "This order could not be found."}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={retry} className="rounded-full bg-agro-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy">
            Try again
          </button>
          <Link href="/orders" className="rounded-full border border-deep-navy/20 px-5 py-2.5 text-sm font-semibold text-deep-navy/70 transition-colors hover:bg-deep-navy/5">
            Back to orders
          </Link>
        </div>
      </div>
    );
  }

  const isFarmer = !!user && user.roles.includes("farmer") && user.id === order.farmer_id;
  const isBuyer = !!user && user.roles.includes("buyer") && user.id === order.buyer_id;
  const isParticipant = !!user && (user.id === order.farmer_id || user.id === order.buyer_id);
  const nextFarmerTransition = isFarmer
    ? FARMER_TRANSITIONS.find((transition) => transition.from === order.status)
    : undefined;
  const canComplete = isBuyer && order.status === "delivered";
  const canCancel =
    isParticipant &&
    (order.status === "pending_payment" || order.status === "payment_failed");
  const showPayNow =
    isBuyer &&
    (order.status === "pending_payment" || order.status === "payment_failed") &&
    order.payment_status !== "paid";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Order ${order.order_number}`}
        description="Payment, delivery and status history for this order."
        breadcrumbs={[
          { label: "Orders", href: "/orders" },
          { label: order.order_number },
        ]}
        action={
          isParticipant ? (
            <Link
              href={isBuyer ? "/buyer/deliveries" : "/farmer/deliveries"}
              className="rounded-full border border-deep-navy/20 px-5 py-2.5 text-sm font-semibold text-deep-navy/70 transition-colors hover:border-agro-green/30 hover:text-agro-green"
            >
              Deliveries
            </Link>
          ) : undefined
        }
      />

      {actionError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </p>
      )}
      {actionNotice && (
        <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {actionNotice}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Section title="Payment history">
            {secondary.payments.length === 0 ? (
              <p className="text-sm text-deep-navy/60">No payment attempts recorded for this order.</p>
            ) : (
              <ul className="space-y-4">
                {secondary.payments.map((payment) => {
                  const refunds = secondary.refunds.filter(
                    (refund) => refund.payment_reference === payment.reference,
                  );
                  return (
                    <li key={payment.id} className="rounded-xl border border-deep-navy/8 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-deep-navy">{payment.reference}</p>
                          <p className="mt-1 text-xs text-deep-navy/55">
                            {payment.provider} · {formatDateTime(payment.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentBadgeClass(payment.status)}`}>
                            {payment.status}
                          </span>
                          <p className="mt-1 text-sm font-bold text-agro-green">
                            {formatMoney(payment.amount, payment.currency)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-deep-navy/60 sm:grid-cols-2">
                        <p>Paid: {formatDateTime(payment.paid_at)}</p>
                        <p>Verified: {formatDateTime(payment.verified_at)}</p>
                      </div>
                      {payment.gateway_response && (
                        <p className="mt-2 text-xs text-deep-navy/55">{payment.gateway_response}</p>
                      )}
                      {refunds.length > 0 && (
                        <div className="mt-4 rounded-xl bg-soft-bg p-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-deep-navy/50">Refund records</p>
                          <ul className="mt-2 space-y-2">
                            {refunds.map((refund) => (
                              <li key={refund.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-deep-navy/70">
                                <span className="truncate">{refund.transaction_reference}</span>
                                <span>
                                  {REFUND_LABEL[refund.status]} · {formatMoney(refund.amount, refund.currency)} · {formatDateTime(refund.processed_at)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title="Fee disclosures">
            {secondary.fees.length === 0 ? (
              <p className="text-sm text-deep-navy/60">No fee disclosures recorded for this order.</p>
            ) : (
              <ul className="divide-y divide-deep-navy/10">
                {secondary.fees.map((fee) => (
                  <li key={fee.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-semibold text-deep-navy">{FEE_LABEL[fee.fee_type]}</p>
                      {fee.description && <p className="mt-1 text-xs text-deep-navy/55">{fee.description}</p>}
                      <p className="mt-1 text-xs text-deep-navy/45">Disclosed {formatDateTime(fee.disclosed_at)}</p>
                      {fee.agreed_at && (
                        <p className="mt-1 text-xs text-agro-green">Agreed {formatDateTime(fee.agreed_at)}</p>
                      )}
                    </div>
                    <p className="text-sm font-bold text-deep-navy">
                      {formatMinor(fee.amount_minor, fee.currency)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Reservation">
            {secondary.reservation ? (
              <div className="grid gap-3 text-sm text-deep-navy/70 sm:grid-cols-2">
                <DetailRow label="Status" value={secondary.reservation.status} />
                <DetailRow label="Quantity" value={secondary.reservation.quantity.toLocaleString()} />
                <DetailRow label="Expires" value={formatDateTime(secondary.reservation.expires_at)} />
                <DetailRow label="Expired" value={secondary.reservation.is_expired ? "Yes" : "No"} />
                <DetailRow label="Released" value={formatDateTime(secondary.reservation.released_at)} />
                <DetailRow label="Release reason" value={secondary.reservation.release_reason} />
                <div className="sm:col-span-2">
                  <Link href="/reservations" className="text-xs font-semibold text-agro-green hover:underline">
                    View all reservations
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-deep-navy/60">No reservation recorded for this order.</p>
            )}
          </Section>

          <Section title="Order history">
            {secondary.events.length === 0 ? (
              <p className="text-sm text-deep-navy/60">No history events recorded for this order.</p>
            ) : (
              <ol className="space-y-4">
                {[...secondary.events].reverse().map((event) => (
                  <li key={event.id} className="border-l-2 border-agro-green/30 pl-4">
                    <p className="text-sm font-semibold text-deep-navy">{statusText(event.action)}</p>
                    <p className="mt-1 text-xs text-deep-navy/60">
                      {event.previous_status || event.new_status
                        ? `${statusText(event.previous_status)} → ${statusText(event.new_status)}`
                        : "Status detail recorded"}
                    </p>
                    <p className="mt-1 text-xs text-deep-navy/45">
                      {formatDateTime(event.created_at)}
                      {event.actor_user_id ? ` · ${event.actor_user_id}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="Cancellation">
            {order.cancellation_reason ? (
              <div role="status" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <p className="font-semibold">This order was cancelled.</p>
                <p className="mt-1">Reason: {order.cancellation_reason}</p>
                <p className="mt-1 text-xs">Cancelled {formatDateTime(order.cancelled_at)}</p>
              </div>
            ) : canCancel ? (
              cancelOpen ? (
                <form onSubmit={(event) => void handleCancel(event)} className="space-y-3">
                  <label htmlFor="cancel-reason" className="block text-sm font-semibold text-deep-navy">
                    Cancellation reason
                  </label>
                  <textarea
                    id="cancel-reason"
                    required
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
                    placeholder="Explain why this order should be cancelled"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={actionBusy}
                      className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionBusy ? "Cancelling…" : "Confirm cancellation"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCancelOpen(false);
                        setCancelReason("");
                      }}
                      className="rounded-full border border-deep-navy/20 px-5 py-2.5 text-sm font-semibold text-deep-navy/70 transition-colors hover:bg-deep-navy/5"
                    >
                      Keep order
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-deep-navy/60">This order can still be cancelled.</p>
                  <button
                    type="button"
                    onClick={() => setCancelOpen(true)}
                    className="rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
                  >
                    Cancel order
                  </button>
                </div>
              )
            ) : (
              <p className="text-sm text-deep-navy/60">This order is not eligible for cancellation.</p>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-deep-navy/55">
              Order summary
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${orderBadgeClass(order.status)}`}>
                {STATUS_LABEL[order.status]}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paymentBadgeClass(order.payment_status)}`}>
                {PAYMENT_LABEL[order.payment_status]}
              </span>
            </div>
            <p className="mt-4 font-heading text-3xl font-extrabold text-agro-green">
              {formatMoney(order.total_amount, order.currency)}
            </p>
            <p className="mt-1 text-sm text-deep-navy/60">
              {order.quantity.toLocaleString()} {order.unit} at {formatMoney(order.unit_price, order.currency)}/{order.unit}
            </p>
            <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <DetailRow label="Listing" value={order.listing?.title ?? order.item?.title ?? null} />
              <DetailRow label="Farmer" value={order.farmer?.display_name ?? null} />
              <DetailRow label="Buyer" value={order.buyer?.display_name ?? null} />
              <DetailRow label="Delivery terms" value={order.delivery_terms} />
              <DetailRow label="Delivery location" value={order.delivery_location} />
              <DetailRow label="Delivery date" value={order.delivery_date} />
              <DetailRow label="Created" value={formatDateTime(order.created_at)} />
              <DetailRow label="Paid" value={formatDateTime(order.paid_at)} />
              <DetailRow label="Completed" value={formatDateTime(order.completed_at)} />
              <DetailRow label="Refunded" value={formatDateTime(order.refunded_at)} />
            </dl>
          </section>

          <section className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-deep-navy/55">
              Actions
            </h2>
            <div className="mt-4 space-y-3">
              {showPayNow && (
                <Link
                  href={`/checkout/${order.id}`}
                  className="block rounded-full bg-agro-green px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
                >
                  Pay now
                </Link>
              )}
              {nextFarmerTransition && (
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleStatusUpdate(nextFarmerTransition.to)}
                  className="w-full rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionBusy ? "Updating…" : nextFarmerTransition.label}
                </button>
              )}
              {canComplete && (
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void handleStatusUpdate("completed")}
                  className="w-full rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionBusy ? "Updating…" : "Confirm completion"}
                </button>
              )}
              {!showPayNow && !nextFarmerTransition && !canComplete && (
                <p className="text-sm text-deep-navy/60">No status actions are available for this order.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
