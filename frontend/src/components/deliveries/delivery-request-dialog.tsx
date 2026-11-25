"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  deliveriesApi,
  ordersApi,
  type ApiError,
  type CreateDeliveryPayload,
  type OrderData,
} from "@/lib/api";
import { ACTIVE_DELIVERY_STATUSES } from "@/lib/delivery";
import { Button, Input, Select, Textarea } from "@/components/ui";

interface DeliveryRequestDialogProps {
  token: string;
  onClose: () => void;
  onCreated: () => void;
}

interface FormState {
  order_id: string;
  pickup_location: string;
  delivery_location: string;
  pickup_latitude: string;
  pickup_longitude: string;
  delivery_latitude: string;
  delivery_longitude: string;
  produce_description: string;
  quantity: string;
  unit: string;
  expected_pickup_date: string;
  expected_delivery_date: string;
  delivery_fee: string;
  currency: string;
  additional_instructions: string;
}

const EMPTY_FORM: FormState = {
  order_id: "",
  pickup_location: "",
  delivery_location: "",
  pickup_latitude: "",
  pickup_longitude: "",
  delivery_latitude: "",
  delivery_longitude: "",
  produce_description: "",
  quantity: "",
  unit: "",
  expected_pickup_date: "",
  expected_delivery_date: "",
  delivery_fee: "",
  currency: "NGN",
  additional_instructions: "",
};

const ELIGIBLE_ORDER_STATUSES = new Set(["paid", "processing", "ready_for_delivery"]);

function todayInput(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function dateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function parseOptionalCoordinate(
  raw: string,
  label: string,
  min: number,
  max: number,
): { value: number | null; error: string } {
  if (!raw.trim()) return { value: null, error: "" };
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    return {
      value: null,
      error: `${label} must be between ${min} and ${max}.`,
    };
  }
  return { value, error: "" };
}

function orderToForm(order: OrderData): FormState {
  return {
    order_id: order.id,
    pickup_location: "",
    delivery_location: order.delivery_location ?? "",
    pickup_latitude: "",
    pickup_longitude: "",
    delivery_latitude: "",
    delivery_longitude: "",
    produce_description:
      order.item?.title ?? order.listing?.title ?? "Produce order",
    quantity: String(order.quantity),
    unit: order.unit,
    expected_pickup_date: todayInput(),
    expected_delivery_date: dateInput(order.delivery_date),
    delivery_fee: "",
    currency: order.currency,
    additional_instructions: "",
  };
}

export function DeliveryRequestDialog({
  token,
  onClose,
  onCreated,
}: DeliveryRequestDialogProps) {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const [ordersRes, deliveriesRes] = await Promise.all([
          ordersApi.list(token, { limit: 50 }),
          deliveriesApi.list(token, { limit: 50 }),
        ]);
        const busyOrderIds = new Set(
          deliveriesRes.data.deliveries
            .filter((delivery) =>
              ACTIVE_DELIVERY_STATUSES.includes(delivery.status),
            )
            .map((delivery) => delivery.order_id),
        );
        const eligible = ordersRes.data.orders.filter(
          (order) =>
            ELIGIBLE_ORDER_STATUSES.has(order.status) &&
            order.payment_status === "paid" &&
            !busyOrderIds.has(order.id),
        );
        setOrders(eligible);
      } catch (err) {
        setError((err as ApiError).message || "Failed to load eligible orders.");
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [token]);

  const orderOptions = useMemo(
    () =>
      orders.map((order) => ({
        value: order.id,
        label: `${order.order_number} · ${order.item?.title ?? order.listing?.title ?? "Order"}`,
      })),
    [orders],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function handleOrderChange(orderId: string) {
    const order = orders.find((item) => item.id === orderId);
    setForm(order ? orderToForm(order) : EMPTY_FORM);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const order = orders.find((item) => item.id === form.order_id);
    if (!order) {
      setError("Choose an eligible order.");
      return;
    }
    if (!form.pickup_location.trim()) {
      setError("Enter a pickup location.");
      return;
    }
    if (!form.delivery_location.trim()) {
      setError("Enter a delivery location.");
      return;
    }
    if (!form.expected_pickup_date || !form.expected_delivery_date) {
      setError("Choose pickup and delivery dates.");
      return;
    }
    if (form.expected_delivery_date < form.expected_pickup_date) {
      setError("Delivery date cannot be before pickup date.");
      return;
    }

    const pickupLatitude = parseOptionalCoordinate(
      form.pickup_latitude,
      "Pickup latitude",
      -90,
      90,
    );
    const pickupLongitude = parseOptionalCoordinate(
      form.pickup_longitude,
      "Pickup longitude",
      -180,
      180,
    );
    const deliveryLatitude = parseOptionalCoordinate(
      form.delivery_latitude,
      "Delivery latitude",
      -90,
      90,
    );
    const deliveryLongitude = parseOptionalCoordinate(
      form.delivery_longitude,
      "Delivery longitude",
      -180,
      180,
    );
    const coordinateError =
      pickupLatitude.error ||
      pickupLongitude.error ||
      deliveryLatitude.error ||
      deliveryLongitude.error;
    if (coordinateError) {
      setError(coordinateError);
      return;
    }
    if (
      (pickupLatitude.value === null) !== (pickupLongitude.value === null) ||
      (deliveryLatitude.value === null) !== (deliveryLongitude.value === null)
    ) {
      setError("Provide both latitude and longitude for each coordinate pair.");
      return;
    }

    const fee = Number(form.delivery_fee);
    if (!Number.isFinite(fee) || fee <= 0) {
      setError("Enter a valid delivery fee greater than zero.");
      return;
    }

    const payload: CreateDeliveryPayload = {
      order_id: form.order_id,
      pickup_location: form.pickup_location.trim(),
      delivery_location: form.delivery_location.trim(),
      pickup_latitude: pickupLatitude.value ?? undefined,
      pickup_longitude: pickupLongitude.value ?? undefined,
      delivery_latitude: deliveryLatitude.value ?? undefined,
      delivery_longitude: deliveryLongitude.value ?? undefined,
      produce_description: form.produce_description.trim() || undefined,
      quantity: Number(form.quantity),
      unit: form.unit.trim() || undefined,
      expected_pickup_date: form.expected_pickup_date,
      expected_delivery_date: form.expected_delivery_date,
      delivery_fee: fee,
      currency: form.currency.trim() || undefined,
      additional_instructions: form.additional_instructions.trim() || undefined,
    };

    setSaving(true);
    setError("");
    try {
      await deliveriesApi.create(token, payload);
      onCreated();
      onClose();
    } catch (err) {
      setError((err as ApiError).message || "Failed to create delivery request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-deep-navy/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-request-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-deep-navy/10 px-6 py-5">
          <div>
            <h2
              id="delivery-request-title"
              className="font-heading text-xl font-extrabold text-deep-navy"
            >
              Request delivery
            </h2>
            <p className="mt-1 text-sm text-deep-navy/55">
              Location, quantity, unit, currency and delivery date must match the
              selected order.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-2 text-deep-navy/45 transition-colors hover:bg-soft-bg hover:text-deep-navy"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-12 rounded-xl bg-deep-navy/8" />
              <div className="h-12 rounded-xl bg-deep-navy/8" />
              <div className="h-12 rounded-xl bg-deep-navy/8" />
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-xl border border-deep-navy/10 bg-soft-bg px-4 py-6 text-center">
              <p className="font-heading text-sm font-bold text-deep-navy">
                No eligible orders
              </p>
              <p className="mt-1 text-sm text-deep-navy/55">
                Paid orders without an active delivery can be arranged here.
              </p>
            </div>
          ) : (
            <>
              <Select
                id="delivery-order"
                label="Order"
                required
                value={form.order_id}
                onChange={(event) => handleOrderChange(event.target.value)}
                options={orderOptions}
                placeholder="Select a paid order"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="pickup-location"
                  label="Pickup location"
                  required
                  value={form.pickup_location}
                  onChange={(event) =>
                    update("pickup_location", event.target.value)
                  }
                  placeholder="Where should the transporter collect?"
                />
                <Input
                  id="delivery-location"
                  label="Delivery location"
                  required
                  value={form.delivery_location}
                  onChange={(event) =>
                    update("delivery_location", event.target.value)
                  }
                  placeholder="Delivery address"
                />
                <Input
                  id="pickup-latitude"
                  label="Pickup latitude"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  value={form.pickup_latitude}
                  onChange={(event) =>
                    update("pickup_latitude", event.target.value)
                  }
                  hint="Optional; include both pickup coordinates to enable the map."
                />
                <Input
                  id="pickup-longitude"
                  label="Pickup longitude"
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  value={form.pickup_longitude}
                  onChange={(event) =>
                    update("pickup_longitude", event.target.value)
                  }
                  hint="Optional; include both pickup coordinates to enable the map."
                />
                <Input
                  id="delivery-latitude"
                  label="Delivery latitude"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  value={form.delivery_latitude}
                  onChange={(event) =>
                    update("delivery_latitude", event.target.value)
                  }
                  hint="Optional; include both destination coordinates to enable the map."
                />
                <Input
                  id="delivery-longitude"
                  label="Delivery longitude"
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  value={form.delivery_longitude}
                  onChange={(event) =>
                    update("delivery_longitude", event.target.value)
                  }
                  hint="Optional; include both destination coordinates to enable the map."
                />
                <Input
                  id="pickup-date"
                  label="Expected pickup date"
                  type="date"
                  required
                  value={form.expected_pickup_date}
                  onChange={(event) =>
                    update("expected_pickup_date", event.target.value)
                  }
                />
                <Input
                  id="delivery-date"
                  label="Expected delivery date"
                  type="date"
                  required
                  value={form.expected_delivery_date}
                  onChange={(event) =>
                    update("expected_delivery_date", event.target.value)
                  }
                />
                <Input
                  id="delivery-quantity"
                  label="Quantity"
                  value={form.quantity}
                  readOnly
                  hint="Must match the order."
                />
                <Input
                  id="delivery-unit"
                  label="Unit"
                  value={form.unit}
                  readOnly
                  hint="Must match the order."
                />
                <Input
                  id="delivery-fee"
                  label="Delivery fee"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.delivery_fee}
                  onChange={(event) =>
                    update("delivery_fee", event.target.value)
                  }
                  placeholder="0.00"
                />
                <Input
                  id="delivery-currency"
                  label="Currency"
                  value={form.currency}
                  readOnly
                  hint="Must match the order."
                />
              </div>
              <Input
                id="produce-description"
                label="Produce description"
                value={form.produce_description}
                onChange={(event) =>
                  update("produce_description", event.target.value)
                }
                placeholder="What is being delivered?"
              />
              <Textarea
                id="delivery-instructions"
                label="Additional instructions"
                value={form.additional_instructions}
                onChange={(event) =>
                  update("additional_instructions", event.target.value)
                }
                rows={3}
                placeholder="Access notes, handling instructions or contact details"
              />
            </>
          )}

          <div className="flex flex-wrap justify-end gap-3 border-t border-deep-navy/10 pt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
              disabled={loading || orders.length === 0}
            >
              Submit request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
