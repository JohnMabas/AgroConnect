import type { ListingData } from "@/lib/api";

const STATUS_BADGE: Record<ListingData["status"], string> = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-green-100 text-green-700",
  paused: "bg-harvest-gold/10 text-harvest-gold",
  closed: "bg-red-100 text-red-700",
  sold_out: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
};

export function StatusBadge({ status }: { status: ListingData["status"] }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
