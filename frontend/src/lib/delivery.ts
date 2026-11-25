import type {
  DeliveryCurrentLocation,
  DeliveryData,
  DeliveryStatus,
  SafeUser,
} from "@/lib/api";

export const DELIVERY_STATUSES: DeliveryStatus[] = [
  "pending",
  "assigned",
  "accepted",
  "picked_up",
  "in_transit",
  "delivered",
  "completed",
  "cancelled",
  "failed",
];

export const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = [
  "pending",
  "assigned",
  "accepted",
  "picked_up",
  "in_transit",
  "delivered",
];

export const TERMINAL_DELIVERY_STATUSES: DeliveryStatus[] = [
  "completed",
  "cancelled",
  "failed",
];

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: "Pending assignment",
  assigned: "Assigned",
  accepted: "Accepted",
  picked_up: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
};

export function deliveryStatusClass(status: DeliveryStatus): string {
  if (status === "completed") return "bg-fresh-green/15 text-agro-green";
  if (status === "delivered" || status === "in_transit" || status === "picked_up") {
    return "bg-agro-green/10 text-agro-green";
  }
  if (status === "accepted" || status === "assigned") {
    return "bg-harvest-gold/15 text-amber-700";
  }
  if (status === "cancelled" || status === "failed") {
    return "bg-red-50 text-red-600";
  }
  return "bg-deep-navy/8 text-deep-navy/60";
}

export function formatDeliveryDate(value: string | null | undefined): string {
  if (!value) return "Not set";
  try {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
    }).format(new Date(value.length === 10 ? `${value}T00:00:00` : value));
  } catch {
    return value;
  }
}

export function formatDeliveryDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatDeliveryMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function userDisplayName(
  user: { id: string; display_name: string | null } | undefined,
  fallback: string,
): string {
  return user?.display_name ?? fallback;
}

export function deliveryCurrentLocation(
  delivery: DeliveryData | null,
): DeliveryCurrentLocation | null {
  if (
    !delivery ||
    typeof delivery.current_latitude !== "number" ||
    typeof delivery.current_longitude !== "number"
  ) {
    return null;
  }
  return {
    latitude: delivery.current_latitude,
    longitude: delivery.current_longitude,
    accuracy_meters: delivery.current_location_accuracy_meters,
    recorded_at: delivery.current_location_recorded_at,
  };
}

export interface DeliveryPermissions {
  isAdmin: boolean;
  isAssignedTransporter: boolean;
  canAssign: boolean;
  canReassign: boolean;
  canAccept: boolean;
  canDecline: boolean;
  canPickUp: boolean;
  canMarkInTransit: boolean;
  canMarkDelivered: boolean;
  canComplete: boolean;
  canCancel: boolean;
  canFail: boolean;
  canShareLocation: boolean;
}

export function deliveryPermissions(
  delivery: DeliveryData | null,
  user: SafeUser | null,
): DeliveryPermissions {
  const empty: DeliveryPermissions = {
    isAdmin: false,
    isAssignedTransporter: false,
    canAssign: false,
    canReassign: false,
    canAccept: false,
    canDecline: false,
    canPickUp: false,
    canMarkInTransit: false,
    canMarkDelivered: false,
    canComplete: false,
    canCancel: false,
    canFail: false,
    canShareLocation: false,
  };
  if (!delivery || !user) return empty;

  const roles = user.roles;
  const isAdmin = roles.includes("admin");
  const isTransporter = roles.includes("transporter");
  const isAssignedTransporter =
    isTransporter && delivery.transporter_id === user.id;
  const isParticipant =
    roles.includes("buyer") && delivery.buyer_id === user.id ||
    roles.includes("farmer") && delivery.farmer_id === user.id;

  return {
    isAdmin,
    isAssignedTransporter,
    canAssign: isAdmin && delivery.status === "pending",
    canReassign:
      isAdmin &&
      (delivery.status === "assigned" || delivery.status === "accepted"),
    canAccept: isAssignedTransporter && delivery.status === "assigned",
    canDecline: isAssignedTransporter && delivery.status === "assigned",
    canPickUp: isAssignedTransporter && delivery.status === "accepted",
    canMarkInTransit: isAssignedTransporter && delivery.status === "picked_up",
    canMarkDelivered: isAssignedTransporter && delivery.status === "in_transit",
    canComplete:
      delivery.status === "delivered" &&
      (isAdmin || (roles.includes("buyer") && delivery.buyer_id === user.id)),
    canCancel:
      isAdmin
        ? ["pending", "assigned", "accepted", "picked_up", "in_transit"].includes(
            delivery.status,
          )
        : isParticipant &&
          ["pending", "assigned", "accepted"].includes(delivery.status),
    canFail:
      (isAdmin ||
        (isAssignedTransporter &&
          ["accepted", "picked_up", "in_transit"].includes(delivery.status))) &&
      ["accepted", "picked_up", "in_transit"].includes(delivery.status),
    canShareLocation:
      isAssignedTransporter &&
      ["accepted", "picked_up", "in_transit"].includes(delivery.status),
  };
}

export function deliveryBackHref(user: SafeUser | null): string {
  const roles = user?.roles ?? [];
  if (roles.includes("admin")) return "/admin/deliveries";
  if (roles.includes("transporter")) return "/transporter/deliveries";
  if (roles.includes("buyer")) return "/buyer/deliveries";
  return "/farmer/deliveries";
}
