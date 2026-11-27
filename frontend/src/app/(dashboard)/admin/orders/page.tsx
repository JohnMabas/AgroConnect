"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  adminApi,
  type ApiError,
  type OrderData,
  type OrderPaymentStatus,
  type OrderStatus,
  type PaginatedOrdersData,
} from "@/lib/api";
import { Badge, Button, Input, Pagination, Spinner } from "@/components/ui";

const PAGE_SIZE = 20;

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

function orderBadge(status: OrderStatus) {
  if (status === "completed" || status === "delivered") {
    return <Badge variant="green" size="sm">{STATUS_LABEL[status]}</Badge>;
  }
  if (status === "cancelled" || status === "payment_failed" || status === "refunded") {
    return <Badge variant="red" size="sm">{STATUS_LABEL[status]}</Badge>;
  }
  if (status === "pending_payment") {
    return <Badge variant="gold" size="sm">{STATUS_LABEL[status]}</Badge>;
  }
  return <Badge variant="navy" size="sm">{STATUS_LABEL[status]}</Badge>;
}

export default function AdminOrdersPage() {
  const { token, loading: authLoading, error: authError } =
    useDashboardAuth("admin");

  const [data, setData] = useState<PaginatedOrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<OrderData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

    const loadOrders = useCallback(async () => {
    if (!token) return null;
    const res = await adminApi.listOrders(token, {
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      status: (status || undefined) as OrderStatus | undefined,
      payment_status: (paymentStatus || undefined) as
        | OrderPaymentStatus
        | undefined,
    });
    return res.data;
  }, [token, page, search, status, paymentStatus]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    loadOrders()
      .then((result) => {
        if (!active || !result) return;
        setData(result);
        setLoadError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load orders.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, loadOrders]);

  function refresh() {
    setLoading(true);
    setLoadError("");
  }


  function handleSearch(e: FormEvent) {
    e.preventDefault();
    refresh();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function resetFilters() {
    refresh();
    setSearchInput("");
    setSearch("");
    setStatus("");
    setPaymentStatus("");
    setPage(1);
  }

  async function openDetail(order: OrderData) {
    if (!token) return;
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await adminApi.getOrder(token, order.id);
      setDetail(res.data.order);
    } catch (err) {
      setLoadError(
        (err as ApiError).message ?? "Failed to load the order.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  if (authLoading) return <PageSkeleton />;
  if (authError) return <ErrorCard message={authError} />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">
          Platform administration
        </p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-deep-navy">
          Orders
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Inspect every order placed on the platform, regardless of participant.
        </p>
      </div>

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {loadError}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            if (status === "") return;
            refresh();
            setStatus("");
            setPage(1);
          }}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            status === ""
              ? "bg-agro-green text-white"
              : "border border-deep-navy/20 text-deep-navy/70 hover:border-agro-green hover:text-agro-green"
          }`}
        >
          All statuses
        </button>
        {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              if (status === value) return;
              refresh();
              setStatus(value);
              setPage(1);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              status === value
                ? "bg-agro-green text-white"
                : "border border-deep-navy/20 text-deep-navy/70 hover:border-agro-green hover:text-agro-green"
            }`}
          >
            {STATUS_LABEL[value]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            if (paymentStatus === "") return;
            refresh();
            setPaymentStatus("");
            setPage(1);
          }}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
            paymentStatus === ""
              ? "bg-deep-navy text-white"
              : "border border-deep-navy/20 text-deep-navy/70 hover:border-deep-navy/40"
          }`}
        >
          Any payment
        </button>
        {(Object.keys(PAYMENT_LABEL) as OrderPaymentStatus[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              if (paymentStatus === value) return;
              refresh();
              setPaymentStatus(value);
              setPage(1);
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              paymentStatus === value
                ? "bg-deep-navy text-white"
                : "border border-deep-navy/20 text-deep-navy/70 hover:border-deep-navy/40"
            }`}
          >
            {PAYMENT_LABEL[value]}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            aria-label="Search orders"
            placeholder="Search by order number, buyer or farmer"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button type="submit" variant="primary" size="md">
          Search
        </Button>
        <Button type="button" variant="ghost" size="md" onClick={resetFilters}>
          Reset
        </Button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-deep-navy/10 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-deep-navy/55">
            <Spinner /> Loading orders…
          </div>
        ) : !data || data.orders.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-heading text-base font-bold text-deep-navy">
              No orders found
            </p>
            <p className="mt-1.5 text-sm text-deep-navy/55">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-deep-navy/10 bg-soft-bg/60 text-xs uppercase tracking-wider text-deep-navy/50">
                    <th className="px-5 py-3 font-semibold">Order</th>
                    <th className="px-5 py-3 font-semibold">Parties</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Payment</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-deep-navy/5">
                  {data.orders.map((order) => (
                    <tr key={order.id} className="align-top">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-deep-navy">
                          {order.order_number}
                        </p>
                        <p className="mt-0.5 text-xs text-deep-navy/55">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-deep-navy/70">
                        <p>Buyer: {order.buyer?.display_name ?? "—"}</p>
                        <p className="mt-0.5">
                          Farmer: {order.farmer?.display_name ?? "—"}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-deep-navy">
                          {order.currency}{" "}
                          {order.total_amount.toLocaleString("en-NG", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        <p className="mt-0.5 text-xs text-deep-navy/55">
                          {order.quantity} {order.unit}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">{orderBadge(order.status)}</td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={
                            order.payment_status === "paid"
                              ? "green"
                              : order.payment_status === "pending"
                                ? "gold"
                                : "red"
                          }
                          size="sm"
                        >
                          {PAYMENT_LABEL[order.payment_status]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void openDetail(order)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-deep-navy/10 px-5 py-4">
              <Pagination
                page={data.page}
                totalPages={data.total_pages}
                onPageChange={(next) => {
                  if (next === page) return;
                  refresh();
                  setPage(next);
                }}
              />
            </div>
          </>
        )}
      </section>

      {(detailLoading || detail) && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-deep-navy/40 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Order details"
          onClick={() => {
            if (!detailLoading) setDetail(null);
          }}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading || !detail ? (
              <div className="flex items-center justify-center gap-3 py-10 text-sm text-deep-navy/55">
                <Spinner /> Loading order…
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-lg font-extrabold text-deep-navy">
                      {detail.order_number}
                    </h2>
                    <p className="mt-0.5 text-sm text-deep-navy/60">
                      {new Date(detail.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetail(null)}
                    aria-label="Close"
                    className="rounded-full p-2 text-deep-navy/40 transition-colors hover:bg-soft-bg hover:text-deep-navy"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-deep-navy/50">Status</dt>
                    <dd>{orderBadge(detail.status)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-deep-navy/50">Payment</dt>
                    <dd>{PAYMENT_LABEL[detail.payment_status]}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-deep-navy/50">Buyer</dt>
                    <dd className="truncate text-right">
                      {detail.buyer?.display_name ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-deep-navy/50">Farmer</dt>
                    <dd className="truncate text-right">
                      {detail.farmer?.display_name ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-deep-navy/50">Listing</dt>
                    <dd className="truncate text-right">
                      {detail.listing?.title ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-deep-navy/50">Quantity</dt>
                    <dd>
                      {detail.quantity} {detail.unit}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-deep-navy/50">Total</dt>
                    <dd className="font-semibold text-deep-navy">
                      {detail.currency}{" "}
                      {detail.total_amount.toLocaleString("en-NG", {
                        minimumFractionDigits: 2,
                      })}
                    </dd>
                  </div>
                  {detail.delivery_location && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-deep-navy/50">Delivery location</dt>
                      <dd className="truncate text-right">
                        {detail.delivery_location}
                      </dd>
                    </div>
                  )}
                  {detail.cancellation_reason && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-deep-navy/50">Cancellation reason</dt>
                      <dd className="truncate text-right">
                        {detail.cancellation_reason}
                      </dd>
                    </div>
                  )}
                </dl>

                {detail.payments && detail.payments.length > 0 && (
                  <div className="mt-5 border-t border-deep-navy/10 pt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-deep-navy/50">
                      Payments
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {detail.payments.map((payment) => (
                        <li
                          key={payment.id}
                          className="flex items-center justify-between gap-3 rounded-xl bg-soft-bg px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-deep-navy">
                              {payment.reference}
                            </p>
                            <p className="text-deep-navy/55">
                              {payment.provider} ·{" "}
                              {new Date(payment.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-semibold text-deep-navy">
                              {payment.currency}{" "}
                              {(payment.amount_minor / 100).toFixed(2)}
                            </p>
                            <p className="capitalize text-deep-navy/55">
                              {payment.status}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-40 rounded-xl bg-deep-navy/10" />
      <div className="h-96 rounded-2xl bg-white shadow-sm" />
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
}
