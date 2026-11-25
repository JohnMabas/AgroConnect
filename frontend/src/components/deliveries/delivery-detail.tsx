"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  deliveriesApi,
  transporterApi,
    type ApiError,
    type DeliveryCurrentLocation,
    type DeliveryData,
    type DeliveryHistoryData,
    type TransporterProfileData,
  } from "@/lib/api";
import {
  DELIVERY_STATUSES,
  DELIVERY_STATUS_LABEL,
  deliveryBackHref,
  deliveryCurrentLocation,
  deliveryPermissions,
  deliveryStatusClass,
  formatDeliveryDate,
  formatDeliveryDateTime,
  formatDeliveryMoney,
  userDisplayName,
} from "@/lib/delivery";
import { useMessaging } from "@/components/messaging/messaging-provider";
import type { DeliveryLocationUpdatedPayload } from "@/lib/messaging-socket";
import { useDeliveryLocationSharing } from "@/hooks/useDeliveryLocationSharing";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, Badge, Button, Select, Skeleton } from "@/components/ui";
import { DeliveryActionDialog } from "./delivery-action-dialog";

const DeliveryMap = dynamic(
  () => import("./delivery-map").then((module) => module.DeliveryMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 animate-pulse rounded-xl bg-deep-navy/5" />
    ),
  },
);

type ActionKind =
  | "accept"
  | "decline"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "completed"
  | "cancelled"
  | "failed";

interface ActionMeta {
  title: string;
  description: string;
  confirmLabel: string;
  reasonLabel?: string;
  reasonRequired?: boolean;
}

const ACTION_META: Record<ActionKind, ActionMeta> = {
  accept: {
    title: "Accept delivery",
    description: "Confirm that you can handle this assigned delivery.",
    confirmLabel: "Accept delivery",
  },
  decline: {
    title: "Decline delivery",
    description: "The assignment will be released so an administrator can reassign it.",
    confirmLabel: "Decline delivery",
    reasonLabel: "Reason for declining",
  },
  picked_up: {
    title: "Mark as picked up",
    description: "Confirm that you have collected the produce from pickup location.",
    confirmLabel: "Confirm pickup",
  },
  in_transit: {
    title: "Mark in transit",
    description: "Confirm that the delivery is on its way to the destination.",
    confirmLabel: "Mark in transit",
  },
  delivered: {
    title: "Mark delivered",
    description: "Confirm arrival at the destination. The buyer can then confirm completion.",
    confirmLabel: "Mark delivered",
  },
  completed: {
    title: "Confirm completion",
    description: "Confirm that the delivered produce was received in acceptable condition.",
    confirmLabel: "Confirm completion",
  },
  cancelled: {
    title: "Cancel delivery",
    description: "This stops the active delivery. Supply a reason for the record.",
    confirmLabel: "Cancel delivery",
    reasonLabel: "Reason for cancellation",
  },
  failed: {
    title: "Report delivery failure",
    description: "A reason is required and will be recorded in the delivery history.",
    confirmLabel: "Report failure",
    reasonLabel: "What went wrong?",
    reasonRequired: true,
  },
};

const HISTORY_LABELS: Record<string, string> = {
  created: "Delivery requested",
  assigned: "Transporter assigned",
  reassigned: "Transporter reassigned",
  accepted: "Delivery accepted",
  declined: "Delivery declined",
  status_changed: "Status changed",
  completed: "Delivery completed",
  cancelled: "Delivery cancelled",
  failed: "Delivery failed",
};

function detailRow(label: string, value: React.ReactNode) {
  return (
    <div className="flex flex-col gap-1 border-b border-deep-navy/5 py-3 last:border-0 sm:flex-row sm:gap-6">
      <dt className="w-44 shrink-0 text-xs font-semibold uppercase tracking-wide text-deep-navy/45">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm text-deep-navy">{value}</dd>
    </div>
  );
}

export function DeliveryDetail({ deliveryId }: { deliveryId: string }) {
  const { token, user, loading: authLoading, error: authError } =
    useDashboardAuth();
  const { socket, connectionStatus } = useMessaging();

  const [delivery, setDelivery] = useState<DeliveryData | null>(null);
  const [history, setHistory] = useState<DeliveryHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingAction, setPendingAction] = useState<ActionKind | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [transporters, setTransporters] = useState<TransporterProfileData[]>([]);
  const [selectedTransporter, setSelectedTransporter] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [liveLocation, setLiveLocation] =
    useState<DeliveryCurrentLocation | null>(null);
  const handleLocationUpdate = useCallback(
    (location: DeliveryCurrentLocation | null) => setLiveLocation(location),
    [],
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [deliveryRes, historyRes] = await Promise.all([
        deliveriesApi.get(token, deliveryId),
        deliveriesApi.history(token, deliveryId),
      ]);
      setDelivery(deliveryRes.data.delivery);
      setLiveLocation(deliveryCurrentLocation(deliveryRes.data.delivery));
      setHistory(historyRes.data.history);
    } catch (err) {
      setError((err as ApiError).message || "Failed to load delivery details.");
    } finally {
      setLoading(false);
    }
  }, [token, deliveryId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = () => void load();
    const onLocationUpdated = (payload: DeliveryLocationUpdatedPayload) => {
      if (payload?.delivery?.id !== deliveryId) return;
      setDelivery(payload.delivery);
      handleLocationUpdate(payload.location.current_location);
    };
    socket.on("delivery:updated", onUpdate);
    socket.on("delivery:location:updated", onLocationUpdated);
    socket.on("connect", onUpdate);
    return () => {
      socket.off("delivery:updated", onUpdate);
      socket.off("delivery:location:updated", onLocationUpdated);
      socket.off("connect", onUpdate);
    };
  }, [socket, load, deliveryId, handleLocationUpdate]);

  const permissions = deliveryPermissions(delivery, user);
  const needsTransporters = permissions.canAssign || permissions.canReassign;
  const locationSharing = useDeliveryLocationSharing({
    token,
    deliveryId,
    enabled: permissions.canShareLocation,
    onLocationUpdate: handleLocationUpdate,
  });

  useEffect(() => {
    if (!token || !needsTransporters) return;
    const timer = window.setTimeout(async () => {
      try {
        const res = await transporterApi.listAvailable(token, { limit: 50 });
        setTransporters(res.data.transporters);
      } catch {
        setTransporters([]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [token, needsTransporters, deliveryId]);

  const candidates = useMemo(() => {
    const location = delivery?.delivery_location?.trim().toLowerCase() ?? "";
    if (!location) return transporters;
    return transporters.filter((transporter) =>
      transporter.coverage_areas.some((area) => {
        const normalized = area.trim().toLowerCase();
        return location.includes(normalized) || normalized.includes(location);
      }),
    );
  }, [transporters, delivery?.delivery_location]);

  const transporterOptions = candidates.map((transporter) => ({
    value: transporter.user_id,
    label: `${transporter.business_name} · ${transporter.operating_location}`,
  }));

  async function runAction(kind: ActionKind, reason: string) {
    if (!token || !delivery) return;
    setActionBusy(true);
    setActionError("");
    setNotice("");
    try {
      let response: { data: { delivery: DeliveryData }; message?: string };
      if (kind === "accept") {
        response = await deliveriesApi.accept(token, delivery.id);
      } else if (kind === "decline") {
        response = await deliveriesApi.decline(token, delivery.id, reason);
      } else {
        const payload =
          kind === "failed" || kind === "cancelled"
            ? { status: kind, reason: reason || undefined }
            : { status: kind };
        response = await deliveriesApi.updateStatus(token, delivery.id, payload);
      }
      setDelivery(response.data.delivery);
      setPendingAction(null);
      setNotice(response.message ?? "Delivery updated.");
      await load();
    } catch (err) {
      setActionError((err as ApiError).message || "Unable to update delivery.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleAssign() {
    if (!token || !delivery || !selectedTransporter) return;
    setAssigning(true);
    setAssignmentError("");
    setNotice("");
    try {
      const response = permissions.canAssign
        ? await deliveriesApi.assign(token, delivery.id, selectedTransporter)
        : await deliveriesApi.reassign(token, delivery.id, selectedTransporter);
      setDelivery(response.data.delivery);
      setNotice(response.message ?? "Transporter updated.");
      await load();
    } catch (err) {
      setAssignmentError((err as ApiError).message || "Unable to assign transporter.");
    } finally {
      setAssigning(false);
    }
  }

  if (authLoading || (loading && !delivery)) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-72 rounded-xl bg-deep-navy/10" />
        <div className="h-16 rounded-2xl bg-white" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (authError || !token || !user || !delivery) {
    return (
      <Alert variant="error">
        {authError || error || "This delivery is not available to your account."}
      </Alert>
    );
  }

  const actorName = (actorId: string | null): string => {
    if (!actorId) return "System";
    if (actorId === user.id) return "You";
    if (actorId === delivery.buyer_id) {
      return userDisplayName(delivery.buyer, "Buyer");
    }
    if (actorId === delivery.farmer_id) {
      return userDisplayName(delivery.farmer, "Farmer");
    }
    if (actorId === delivery.transporter_id) {
      return userDisplayName(delivery.transporter, "Transporter");
    }
    return "Participant";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={delivery.delivery_reference}
        description="Delivery route, status history and available actions."
        breadcrumbs={[
          { label: "Deliveries", href: deliveryBackHref(user) },
          { label: delivery.delivery_reference },
        ]}
        action={
          <Link
            href={deliveryBackHref(user)}
            className="rounded-full border border-deep-navy/15 px-4 py-2 text-sm font-semibold text-deep-navy/70 transition-colors hover:border-agro-green/30 hover:text-agro-green"
          >
            ← All deliveries
          </Link>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-deep-navy/8 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={deliveryStatusClass(delivery.status)}>
            {DELIVERY_STATUS_LABEL[delivery.status]}
          </Badge>
          <Badge variant={connectionStatus === "connected" ? "green" : "gold"} size="sm" dot>
            {connectionStatus === "connected" ? "Live updates" : "Reconnecting"}
          </Badge>
        </div>
        <p className="text-xs text-deep-navy/45">
          Created {formatDeliveryDateTime(delivery.created_at)}
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}
      {actionError && <Alert variant="error">{actionError}</Alert>}
      {assignmentError && <Alert variant="error">{assignmentError}</Alert>}

      <section className="rounded-2xl border border-deep-navy/8 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-bold text-deep-navy">
              Delivery route map
            </h2>
            <p className="mt-1 text-sm text-deep-navy/55">
              Pickup, destination and the last reported transporter position are
              shown only when real coordinates are available.
            </p>
          </div>
          {permissions.canShareLocation && (
            <div className="flex flex-col items-end gap-2">
              <Badge
                variant={locationSharing.sharing ? "green" : "gold"}
                size="sm"
                dot
              >
                {locationSharing.sharing ? "Sharing location" : "Sharing paused"}
              </Badge>
              <Button
                size="sm"
                variant={locationSharing.sharing ? "outline" : "primary"}
                onClick={() => {
                  if (locationSharing.sharing) locationSharing.stop();
                  else locationSharing.start();
                }}
              >
                {locationSharing.sharing
                  ? "Stop sharing location"
                  : "Share live location"}
              </Button>
            </div>
          )}
        </div>
        {locationSharing.error && (
          <div className="mt-4">
            <Alert variant="error">{locationSharing.error}</Alert>
          </div>
        )}
        {locationSharing.warning && (
          <div className="mt-4">
            <Alert variant="warning">{locationSharing.warning}</Alert>
          </div>
        )}
        <div className="mt-5">
          <DeliveryMap
            pickupLatitude={delivery.pickup_latitude}
            pickupLongitude={delivery.pickup_longitude}
            deliveryLatitude={delivery.delivery_latitude}
            deliveryLongitude={delivery.delivery_longitude}
            currentLatitude={liveLocation?.latitude ?? null}
            currentLongitude={liveLocation?.longitude ?? null}
            currentAccuracyMeters={liveLocation?.accuracy_meters ?? null}
            currentRecordedAt={liveLocation?.recorded_at ?? null}
            pickupLabel={`Pickup · ${delivery.pickup_location}`}
            deliveryLabel={`Destination · ${delivery.delivery_location ?? "Delivery location"}`}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-deep-navy/8 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="font-heading text-lg font-bold text-deep-navy">
            Delivery details
          </h2>
          <dl className="mt-2">
            {detailRow(
              "Order",
              <Link
                href={`/orders/${delivery.order_id}`}
                className="font-semibold text-agro-green hover:underline"
              >
                {delivery.order?.order_number ?? "View order"}
              </Link>,
            )}
            {detailRow(
              "Farmer",
              userDisplayName(delivery.farmer, "AgroConnect farmer"),
            )}
            {detailRow(
              "Buyer",
              userDisplayName(delivery.buyer, "AgroConnect buyer"),
            )}
            {detailRow(
              "Transporter",
              delivery.transporter_id
                ? userDisplayName(delivery.transporter, "Assigned transporter")
                : "Not assigned",
            )}
            {detailRow("Pickup location", delivery.pickup_location)}
            {detailRow("Delivery location", delivery.delivery_location ?? "Not set")}
            {detailRow(
              "Produce",
              delivery.produce_description ??
                delivery.order?.order_number ??
                "Not specified",
            )}
            {detailRow(
              "Quantity",
              `${delivery.quantity} ${delivery.unit}`,
            )}
            {detailRow(
              "Fee",
              formatDeliveryMoney(delivery.delivery_fee, delivery.currency),
            )}
            {detailRow(
              "Expected pickup",
              formatDeliveryDate(delivery.expected_pickup_date),
            )}
            {detailRow(
              "Expected delivery",
              formatDeliveryDate(delivery.expected_delivery_date),
            )}
            {delivery.additional_instructions
              ? detailRow("Instructions", delivery.additional_instructions)
              : null}
            {delivery.cancellation_reason
              ? detailRow("Cancellation reason", delivery.cancellation_reason)
              : null}
            {delivery.failure_reason
              ? detailRow("Failure reason", delivery.failure_reason)
              : null}
          </dl>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-deep-navy/8 bg-white p-6 shadow-sm">
            <h2 className="font-heading text-lg font-bold text-deep-navy">
              Available actions
            </h2>
            <div className="mt-4 flex flex-col gap-2">
              {permissions.canAccept && (
                <Button size="sm" onClick={() => setPendingAction("accept")}>
                  Accept delivery
                </Button>
              )}
              {permissions.canDecline && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPendingAction("decline")}
                >
                  Decline delivery
                </Button>
              )}
              {permissions.canPickUp && (
                <Button size="sm" onClick={() => setPendingAction("picked_up")}>
                  Mark picked up
                </Button>
              )}
              {permissions.canMarkInTransit && (
                <Button size="sm" onClick={() => setPendingAction("in_transit")}>
                  Mark in transit
                </Button>
              )}
              {permissions.canMarkDelivered && (
                <Button size="sm" onClick={() => setPendingAction("delivered")}>
                  Mark delivered
                </Button>
              )}
              {permissions.canComplete && (
                <Button size="sm" onClick={() => setPendingAction("completed")}>
                  Confirm completion
                </Button>
              )}
              {permissions.canFail && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPendingAction("failed")}
                >
                  Report failure
                </Button>
              )}
              {permissions.canCancel && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setPendingAction("cancelled")}
                >
                  Cancel delivery
                </Button>
              )}
              {!permissions.canAccept &&
                !permissions.canDecline &&
                !permissions.canPickUp &&
                !permissions.canMarkInTransit &&
                !permissions.canMarkDelivered &&
                !permissions.canComplete &&
                !permissions.canFail &&
                !permissions.canCancel && (
                  <p className="text-sm text-deep-navy/55">
                    No actions are available for your role at this stage.
                  </p>
                )}
            </div>
          </section>

          {needsTransporters && (
            <section className="rounded-2xl border border-harvest-gold/25 bg-white p-6 shadow-sm">
              <h2 className="font-heading text-lg font-bold text-deep-navy">
                {permissions.canAssign ? "Assign transporter" : "Reassign transporter"}
              </h2>
              <p className="mt-1 text-xs text-deep-navy/55">
                Only approved, available transporters covering the delivery location
                can be assigned.
              </p>
              <div className="mt-4">
                {candidates.length === 0 ? (
                  <p className="text-sm text-amber-700">
                    No available transporter covers this delivery location.
                  </p>
                ) : (
                  <>
                    <Select
                      id="assign-transporter"
                      label="Transporter"
                      value={selectedTransporter}
                      onChange={(event) => {
                        setSelectedTransporter(event.target.value);
                        setAssignmentError("");
                      }}
                      options={transporterOptions}
                      placeholder="Select a transporter"
                    />
                    <Button
                      size="sm"
                      className="mt-4"
                      disabled={!selectedTransporter}
                      loading={assigning}
                      onClick={() => void handleAssign()}
                    >
                      {permissions.canAssign ? "Assign" : "Reassign"}
                    </Button>
                  </>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-deep-navy/8 bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-bold text-deep-navy">
          Delivery history
        </h2>
        {!history || history.events.length === 0 ? (
          <p className="mt-3 text-sm text-deep-navy/55">No history yet.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {history.events.map((event) => {
              const newStatus = DELIVERY_STATUSES.includes(
                event.new_status as (typeof DELIVERY_STATUSES)[number],
              )
                ? (event.new_status as (typeof DELIVERY_STATUSES)[number])
                : null;
              return (
                <li key={event.id} className="flex gap-4">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-agro-green" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-deep-navy">
                        {HISTORY_LABELS[event.action] ?? event.action}
                      </p>
                      {newStatus && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${deliveryStatusClass(newStatus)}`}
                        >
                          {DELIVERY_STATUS_LABEL[newStatus]}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="mt-1 text-sm text-deep-navy/60">
                        {event.description}
                      </p>
                    )}
                    {event.location && (
                      <p className="mt-1 text-xs text-deep-navy/50">
                        Location: {event.location}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-deep-navy/40">
                      {actorName(event.actor_user_id)} ·{" "}
                      {formatDeliveryDateTime(event.created_at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {pendingAction && (
        <DeliveryActionDialog
          title={ACTION_META[pendingAction].title}
          description={ACTION_META[pendingAction].description}
          confirmLabel={ACTION_META[pendingAction].confirmLabel}
          reasonLabel={ACTION_META[pendingAction].reasonLabel}
          reasonRequired={ACTION_META[pendingAction].reasonRequired}
          busy={actionBusy}
          onClose={() => setPendingAction(null)}
          onConfirm={(reason) => void runAction(pendingAction, reason)}
        />
      )}
    </div>
  );
}
