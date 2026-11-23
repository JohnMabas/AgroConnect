"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { CardSkeleton, LineSkeleton } from "@/components/dashboard/skeleton";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  ApiError,
  ordersApi,
  paymentsApi,
  type OrderData,
} from "@/lib/api";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

function formatMoney(value: number, currency: string): string {
  if (currency === "NGN") return `₦${value.toLocaleString()}`;
  return `${currency} ${value.toLocaleString()}`;
}

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function CheckoutSkeleton() {
  return (
    <div className="space-y-6">
      <LineSkeleton width="w-72" />
      <CardSkeleton lines={6} />
    </div>
  );
}

export default function CheckoutClient({ orderId }: { orderId: string }) {
  const { token, user, loading: authLoading, error: authError } = useDashboardAuth();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [initializing, setInitializing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const loadOrder = useCallback(
    async (accessToken: string, id: string) => {
      const response = await ordersApi.get(accessToken, id);
      return response.data.order;
    },
    [],
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    void loadOrder(token, orderId)
      .then((loadedOrder) => {
        if (!active) return;
        setOrder(loadedOrder);
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
  }, [token, orderId, retryKey, loadOrder]);

  function retry() {
    setError("");
    setLoading(true);
    setRetryKey((value) => value + 1);
  }

  async function handleInitialize() {
    if (!token || !order || user?.id !== order.buyer_id) return;
    setInitializing(true);
    setActionError("");
    setNotice("");
    try {
      const response = await paymentsApi.initialize(token, order.id);
      const target = new URL(response.data.authorization_url);
      if (target.protocol !== "https:" && target.protocol !== "http:") {
        throw new Error("The payment redirect URL is invalid.");
      }
      setNotice("Redirecting to Paystack to complete payment…");
      window.location.assign(target.toString());
    } catch (err) {
      setActionError(errorMessage(err, "Unable to start payment for this order."));
      setInitializing(false);
    }
  }

  if (authLoading || loading) return <CheckoutSkeleton />;

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

  if (error || !order) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h1 className="font-heading text-lg font-bold text-deep-navy">Checkout unavailable</h1>
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

  const alreadyPaid = order.payment_status === "paid" || order.status === "paid";
  const isBuyer = user?.id === order.buyer_id;
  const canPay = isBuyer && !alreadyPaid;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Checkout"
        description="Review the amount before you are redirected to Paystack."
        breadcrumbs={[
          { label: "Orders", href: "/orders" },
          { label: order.order_number, href: `/orders/${order.id}` },
          { label: "Checkout" },
        ]}
      />

      <section className="rounded-2xl border border-deep-navy/8 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-deep-navy/45">{order.order_number}</p>
            <h2 className="mt-1 font-heading text-lg font-bold text-deep-navy">
              {order.listing?.title ?? order.item?.title ?? `Order ${order.order_number}`}
            </h2>
          </div>
          <span className="rounded-full bg-deep-navy/8 px-2.5 py-1 text-xs font-semibold text-deep-navy/60">
            {order.payment_status}
          </span>
        </div>

        <div className="mt-6 rounded-xl bg-soft-bg p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-deep-navy/50">Amount due</p>
          <p className="mt-2 font-heading text-3xl font-extrabold text-agro-green">
            {formatMoney(order.total_amount, order.currency)}
          </p>
          <p className="mt-1 text-sm text-deep-navy/60">
            {order.quantity.toLocaleString()} {order.unit} at {formatMoney(order.unit_price, order.currency)}/{order.unit}
          </p>
        </div>

        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-deep-navy/45">Created</dt>
            <dd className="mt-1 text-deep-navy/80">{formatDateTime(order.created_at)}</dd>
          </div>
          {order.reservation_expires_at && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-deep-navy/45">Reservation expires</dt>
              <dd className="mt-1 text-deep-navy/80">{formatDateTime(order.reservation_expires_at)}</dd>
            </div>
          )}
        </dl>

        {actionError && (
          <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {notice}
          </p>
        )}

        <div className="mt-6">
          {canPay ? (
            <button
              type="button"
              onClick={() => void handleInitialize()}
              disabled={initializing}
              className="w-full rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
            >
              {initializing ? "Starting payment…" : "Pay with Paystack"}
            </button>
          ) : (
            <Link
              href={`/orders/${order.id}`}
              className="block rounded-full bg-agro-green px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
            >
              {alreadyPaid ? "View order details" : "Back to order details"}
            </Link>
          )}
          {canPay && (
            <p className="mt-3 text-center text-xs text-deep-navy/55">
              You will leave AgroConnect to complete payment. Return through the payment callback so the result can be verified.
            </p>
          )}
          {!isBuyer && !alreadyPaid && (
            <p className="mt-3 text-center text-xs text-deep-navy/55">
              Only the buyer can start payment for this order.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
