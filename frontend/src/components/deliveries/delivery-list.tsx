"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  deliveriesApi,
  type ApiError,
  type DeliveryData,
  type DeliveryStatus,
} from "@/lib/api";
import {
  ACTIVE_DELIVERY_STATUSES,
  DELIVERY_STATUS_LABEL,
  TERMINAL_DELIVERY_STATUSES,
  deliveryStatusClass,
  formatDeliveryDate,
  formatDeliveryMoney,
  userDisplayName,
} from "@/lib/delivery";
import { useMessaging } from "@/components/messaging/messaging-provider";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Alert, Badge, Button, Pagination, Skeleton } from "@/components/ui";
import { DeliveryRequestDialog } from "./delivery-request-dialog";

type DeliveryMode = "farmer" | "buyer" | "transporter" | "admin";

interface DeliveryListProps {
  mode: DeliveryMode;
}

const PAGE_LIMIT = 10;

const PAGE_COPY: Record<DeliveryMode, { title: string; description: string }> = {
  farmer: {
    title: "Deliveries",
    description: "Track delivery requests for orders sold from your produce.",
  },
  buyer: {
    title: "Deliveries",
    description: "Track deliveries for orders you purchased.",
  },
  transporter: {
    title: "My deliveries",
    description: "Deliveries assigned to you and their current status.",
  },
  admin: {
    title: "Delivery management",
    description: "Assign transporters and monitor delivery progress.",
  },
};

const TABS: Array<{ value: DeliveryStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "accepted", label: "Accepted" },
  { value: "picked_up", label: "Picked up" },
  { value: "in_transit", label: "In transit" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "failed", label: "Failed" },
];

function requiredRole(mode: DeliveryMode): string | undefined {
  if (mode === "farmer" || mode === "buyer" || mode === "transporter" || mode === "admin") {
    return mode;
  }
  return undefined;
}

export function DeliveryList({ mode }: DeliveryListProps) {
  const { token, user, loading: authLoading, error: authError } =
    useDashboardAuth(requiredRole(mode));
  const { socket, connectionStatus } = useMessaging();

  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [status, setStatus] = useState<DeliveryStatus | "all">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const params = {
        page,
        limit: PAGE_LIMIT,
        status: status === "all" ? undefined : status,
        sort,
      };
      const res =
        mode === "transporter"
          ? await deliveriesApi.getMyDeliveries(token, params)
          : await deliveriesApi.list(token, params);
      setDeliveries(res.data.deliveries);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      setError((err as ApiError).message || "Failed to load deliveries.");
    } finally {
      setLoading(false);
    }
  }, [token, mode, page, status, sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = () => void load();
    socket.on("delivery:updated", onUpdate);
    socket.on("connect", onUpdate);
    return () => {
      socket.off("delivery:updated", onUpdate);
      socket.off("connect", onUpdate);
    };
  }, [socket, load]);

  const stats = useMemo(
    () => ({
      active: deliveries.filter((delivery) =>
        ACTIVE_DELIVERY_STATUSES.includes(delivery.status),
      ).length,
      completed: deliveries.filter(
        (delivery) => delivery.status === "completed",
      ).length,
      attention: deliveries.filter(
        (delivery) =>
          delivery.status === "failed" || delivery.status === "cancelled",
      ).length,
      terminal: deliveries.filter((delivery) =>
        TERMINAL_DELIVERY_STATUSES.includes(delivery.status),
      ).length,
    }),
    [deliveries],
  );

  const canCreate = mode === "farmer" || mode === "buyer";

  if (authLoading || (loading && deliveries.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 rounded-xl bg-deep-navy/10" />
        <div className="grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-12 rounded-2xl" />
        <div className="space-y-3 rounded-2xl bg-white p-5">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (authError || !token || !user) {
    return (
      <Alert variant="error">
        {authError || "You must be signed in to view deliveries."}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={PAGE_COPY[mode].title}
        description={PAGE_COPY[mode].description}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={connectionStatus === "connected" ? "green" : "gold"}
              size="sm"
              dot
            >
              {connectionStatus === "connected" ? "Live updates" : "Reconnecting"}
            </Badge>
            {canCreate && (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                Request delivery
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <Alert variant="error">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-semibold hover:bg-white"
            >
              Try again
            </button>
          </div>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total results", value: total, accent: "text-deep-navy" },
          { label: "Active on page", value: stats.active, accent: "text-agro-green" },
          { label: "Completed on page", value: stats.completed, accent: "text-fresh-green" },
          { label: "Closed on page", value: stats.terminal, accent: "text-amber-700" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-deep-navy/8 bg-white px-5 py-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-deep-navy/45">
              {item.label}
            </p>
            <p className={`mt-2 font-heading text-2xl font-extrabold ${item.accent}`}>
              {item.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-2xl border border-deep-navy/8 bg-white p-1.5 shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                status === tab.value
                  ? "bg-agro-green text-white shadow-sm"
                  : "text-deep-navy/60 hover:bg-soft-bg hover:text-deep-navy"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label className="text-xs font-semibold text-deep-navy/60">
          Sort
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as "newest" | "oldest");
              setPage(1);
            }}
            className="ml-2 rounded-xl border border-deep-navy/20 bg-white px-3 py-2 text-sm text-deep-navy outline-none focus:border-agro-green"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-deep-navy/8 bg-white shadow-sm">
        {deliveries.length === 0 && !loading ? (
          <EmptyState
            title={status === "all" ? "No deliveries yet" : `No ${status.replace(/_/g, " ")} deliveries`}
            description={
              canCreate
                ? "Request a delivery from a paid order to get started."
                : "Deliveries assigned to you will appear here."
            }
            actionLabel={canCreate ? "Request delivery" : undefined}
            onAction={canCreate ? () => setDialogOpen(true) : undefined}
          />
        ) : (
          <ul className="divide-y divide-deep-navy/5">
            {deliveries.map((delivery) => {
              const counterpart =
                mode === "transporter"
                  ? delivery.farmer
                  : delivery.transporter;
              const counterpartLabel =
                mode === "transporter" ? "Farmer" : "Transporter";

              return (
                <li key={delivery.id} className="px-5 py-4 transition-colors hover:bg-soft-bg/40">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/deliveries/${delivery.id}`}
                          className="font-heading text-sm font-bold text-deep-navy transition-colors hover:text-agro-green hover:underline"
                        >
                          {delivery.delivery_reference}
                        </Link>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${deliveryStatusClass(delivery.status)}`}
                        >
                          {DELIVERY_STATUS_LABEL[delivery.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-deep-navy/50">
                        Order{" "}
                        <Link
                          href={`/orders/${delivery.order_id}`}
                          className="font-semibold text-agro-green hover:underline"
                        >
                          {delivery.order?.order_number ?? "details"}
                        </Link>
                        {counterpart
                          ? ` · ${counterpartLabel}: ${userDisplayName(counterpart, "AgroConnect user")}`
                          : ""}
                      </p>
                      <div className="mt-3 grid gap-2 text-xs text-deep-navy/60 sm:grid-cols-2 lg:grid-cols-4">
                        <p>
                          <span className="font-semibold text-deep-navy/75">Pickup:</span>{" "}
                          {delivery.pickup_location}
                        </p>
                        <p>
                          <span className="font-semibold text-deep-navy/75">Destination:</span>{" "}
                          {delivery.delivery_location ?? "Not set"}
                        </p>
                        <p>
                          <span className="font-semibold text-deep-navy/75">Pickup date:</span>{" "}
                          {formatDeliveryDate(delivery.expected_pickup_date)}
                        </p>
                        <p>
                          <span className="font-semibold text-deep-navy/75">Delivery date:</span>{" "}
                          {formatDeliveryDate(delivery.expected_delivery_date)}
                        </p>
                      </div>
                      <p className="mt-2 text-xs text-deep-navy/45">
                        {delivery.quantity} {delivery.unit} · Fee{" "}
                        {formatDeliveryMoney(delivery.delivery_fee, delivery.currency)}
                      </p>
                    </div>
                    <Link
                      href={`/deliveries/${delivery.id}`}
                      className="inline-flex shrink-0 items-center rounded-full border border-agro-green/30 px-4 py-2 text-xs font-semibold text-agro-green transition-colors hover:bg-agro-green hover:text-white"
                    >
                      Manage
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {dialogOpen && (
        <DeliveryRequestDialog
          token={token}
          onClose={() => setDialogOpen(false)}
          onCreated={() => void load()}
        />
      )}
    </div>
  );
}
