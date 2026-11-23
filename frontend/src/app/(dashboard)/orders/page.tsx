"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CardSkeleton, LineSkeleton } from "@/components/dashboard/skeleton";
import { PageHeader } from "@/components/dashboard/page-header";
import { Pagination } from "@/components/ui";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  ApiError,
  ordersApi,
  type OrderData,
  type OrderPaymentStatus,
  type OrderStatus,
  type PaginatedOrdersData,
} from "@/lib/api";

type StatusTab = OrderStatus | "all";
type PaymentTab = OrderPaymentStatus | "all";

const PAGE_SIZE = 10;

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

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: "all", label: "All orders" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "paid", label: "Paid" },
  { value: "processing", label: "Processing" },
  { value: "ready_for_delivery", label: "Ready" },
  { value: "in_transit", label: "In transit" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "payment_failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const PAYMENT_TABS: Array<{ value: PaymentTab; label: string }> = [
  { value: "all", label: "Any payment status" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
  { value: "partially_refunded", label: "Partial refund" },
];

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

function formatMoney(value: number, currency: string): string {
  if (currency === "NGN") return `₦${value.toLocaleString()}`;
  return `${currency} ${value.toLocaleString()}`;
}

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusBadgeClass(status: OrderStatus): string {
  if (status === "paid" || status === "completed" || status === "delivered") {
    return "bg-fresh-green/15 text-agro-green";
  }
  if (status === "pending_payment" || status === "processing" || status === "in_transit" || status === "ready_for_delivery") {
    return "bg-harvest-gold/15 text-amber-700";
  }
  if (status === "cancelled" || status === "payment_failed" || status === "refunded") {
    return "bg-red-50 text-red-600";
  }
  return "bg-deep-navy/8 text-deep-navy/60";
}

function paymentBadgeClass(status: OrderPaymentStatus): string {
  if (status === "paid") return "bg-fresh-green/15 text-agro-green";
  if (status === "pending") return "bg-harvest-gold/15 text-amber-700";
  if (status === "partially_refunded") return "bg-blue-50 text-blue-700";
  return "bg-red-50 text-red-600";
}

function OrderCard({ order }: { order: OrderData }) {
  const created = formatDateTime(order.created_at);
  return (
    <li>
      <Link
        href={`/orders/${order.id}`}
        className="block rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agro-green/40"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-deep-navy/45">
              {order.order_number}
            </p>
            <h2 className="mt-1 truncate font-heading text-base font-bold text-deep-navy">
              {order.listing?.title ?? order.item?.title ?? `Order ${order.order_number}`}
            </h2>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(order.status)}`}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-baseline gap-2">
          <span className="font-heading text-xl font-extrabold text-agro-green">
            {formatMoney(order.total_amount, order.currency)}
          </span>
          <span className="text-sm text-deep-navy/60">
            {order.quantity.toLocaleString()} {order.unit} · {formatMoney(order.unit_price, order.currency)}/{order.unit}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-deep-navy/55">
          <span className={`rounded-full px-2.5 py-1 font-semibold ${paymentBadgeClass(order.payment_status)}`}>
            {PAYMENT_LABEL[order.payment_status]}
          </span>
          {created && <span>Placed {created}</span>}
          {order.buyer?.display_name && <span>Buyer: {order.buyer.display_name}</span>}
          {order.farmer?.display_name && <span>Farmer: {order.farmer.display_name}</span>}
        </div>
      </Link>
    </li>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-6">
      <LineSkeleton width="w-64" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-9 w-28 rounded-full bg-deep-navy/8" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { token, loading: authLoading, error: authError } = useDashboardAuth();
  const [status, setStatus] = useState<StatusTab>("all");
  const [paymentStatus, setPaymentStatus] = useState<PaymentTab>("all");
  const [page, setPage] = useState(1);
  const [retryKey, setRetryKey] = useState(0);
  const [data, setData] = useState<PaginatedOrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(
    async (accessToken: string, pageNumber: number, statusTab: StatusTab, paymentTab: PaymentTab) => {
      const response = await ordersApi.list(accessToken, {
        page: pageNumber,
        limit: PAGE_SIZE,
        ...(statusTab !== "all" ? { status: statusTab } : {}),
        ...(paymentTab !== "all" ? { payment_status: paymentTab } : {}),
      });
      return response.data;
    },
    [],
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    void loadOrders(token, page, status, paymentStatus)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError("");
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(errorMessage(err, "Unable to load orders."));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, page, status, paymentStatus, retryKey, loadOrders]);

  function selectStatus(next: StatusTab) {
    if (next === status) return;
    setStatus(next);
    setPage(1);
    setLoading(true);
  }

  function selectPaymentStatus(next: PaymentTab) {
    if (next === paymentStatus) return;
    setPaymentStatus(next);
    setPage(1);
    setLoading(true);
  }

  function changePage(next: number) {
    setPage(next);
    setLoading(true);
  }

  function retry() {
    setError("");
    setLoading(true);
    setRetryKey((value) => value + 1);
  }

  if (authLoading || loading) return <OrdersSkeleton />;

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

  const orders = data?.orders ?? [];
  const totalPages = data?.total_pages ?? 1;
  const hasFilter = status !== "all" || paymentStatus !== "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Track purchases and sales from accepted offers."
      />

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={retry} className="font-semibold underline underline-offset-2">
            Try again
          </button>
        </div>
      )}

      <div className="space-y-3">
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-1.5 rounded-2xl border border-deep-navy/8 bg-white p-1.5 shadow-sm">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                aria-pressed={status === tab.value}
                onClick={() => selectStatus(tab.value)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                  status === tab.value
                    ? "bg-agro-green text-white shadow-sm"
                    : "text-deep-navy/60 hover:bg-soft-bg hover:text-deep-navy"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-1.5 rounded-2xl border border-deep-navy/8 bg-white p-1.5 shadow-sm">
            {PAYMENT_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                aria-pressed={paymentStatus === tab.value}
                onClick={() => selectPaymentStatus(tab.value)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                  paymentStatus === tab.value
                    ? "bg-deep-navy text-white shadow-sm"
                    : "text-deep-navy/60 hover:bg-soft-bg hover:text-deep-navy"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {data && (
        <p className="text-xs text-deep-navy/50">
          {data.total} {data.total === 1 ? "order" : "orders"}
        </p>
      )}

      {orders.length === 0 && !error ? (
        <div className="rounded-2xl border border-deep-navy/8 bg-white shadow-sm">
          <EmptyState
            title={hasFilter ? "No matching orders" : "No orders yet"}
            description={
              hasFilter
                ? "Try a different status or payment status filter."
                : "Orders created from accepted offers will appear here."
            }
            actionLabel={hasFilter ? "Clear filters" : undefined}
            onAction={
              hasFilter
                ? () => {
                    setStatus("all");
                    setPaymentStatus("all");
                    setPage(1);
                    setLoading(true);
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={changePage} />
    </div>
  );
}
