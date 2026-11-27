"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  adminApi,
  type AdminPaymentSummary,
  type AdminPaymentsData,
} from "@/lib/api";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge, Button, Input, Pagination, Spinner } from "@/components/ui";

const PAGE_SIZE = 20;

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "success", label: "Successful" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "abandoned", label: "Abandoned" },
  { value: "refunded", label: "Refunded" },
  { value: "partially_refunded", label: "Partially refunded" },
];

function statusBadge(status: string) {
  if (status === "success") return <Badge variant="green" size="sm">Successful</Badge>;
  if (status === "pending") return <Badge variant="gold" size="sm">Pending</Badge>;
  if (status === "abandoned") return <Badge variant="gray" size="sm">Abandoned</Badge>;
  if (status === "refunded" || status === "partially_refunded") {
    return <Badge variant="navy" size="sm">{status.replace("_", " ")}</Badge>;
  }
  return <Badge variant="red" size="sm">Failed</Badge>;
}

function formatNaira(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

function PaymentsContent() {
  const searchParams = useSearchParams();
  const { token, loading: authLoading, error: authError } =
    useDashboardAuth("admin");

  const [data, setData] = useState<AdminPaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(() => {
    const initial = searchParams.get("status") ?? "";
    return STATUS_FILTERS.some((filter) => filter.value === initial)
      ? initial
      : "";
  });
  const [page, setPage] = useState(1);

  const loadPayments = useCallback(async () => {
    if (!token) return null;
    const res = await adminApi.listPayments(token, {
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      status: (status || undefined) as AdminPaymentSummary["status"] | undefined,
    });
    return res.data;
  }, [token, page, search, status]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    loadPayments()
      .then((result) => {
        if (!active || !result) return;
        setData(result);
        setLoadError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load payments.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, loadPayments]);

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
    setPage(1);
  }

  if (authLoading) return <PageSkeleton />;
  if (authError) return <ErrorCard message={authError} />;

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-agro-green">
          Platform administration
        </p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-deep-navy">
          Payments
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Track every payment recorded against platform orders.
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Successful"
          value={summary ? summary.successful : null}
          accentColor="text-agro-green"
        />
        <StatCard
          label="Pending"
          value={summary ? summary.pending : null}
          accentColor="text-amber-600"
        />
        <StatCard
          label="Failed"
          value={summary ? summary.failed : null}
          accentColor="text-red-500"
        />
        <StatCard
          label="Successful value"
          value={
            summary
              ? formatNaira(summary.successful_amount_minor, summary.currency)
              : null
          }
          accentColor="text-deep-navy"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(({ label, value }) => (
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
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            aria-label="Search payments"
            placeholder="Search by reference or order number"
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
            <Spinner /> Loading payments…
          </div>
        ) : !data || data.payments.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-heading text-base font-bold text-deep-navy">
              No payments found
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
                    <th className="px-5 py-3 font-semibold">Reference</th>
                    <th className="px-5 py-3 font-semibold">Order</th>
                    <th className="px-5 py-3 font-semibold">Parties</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-deep-navy/5">
                  {data.payments.map((payment) => (
                    <tr key={payment.id} className="align-top">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-deep-navy">
                          {payment.reference}
                        </p>
                        <p className="mt-0.5 text-xs text-deep-navy/55">
                          {payment.provider}
                          {payment.channel ? ` · ${payment.channel}` : ""}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-deep-navy/70">
                        {payment.order_number ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-deep-navy/70">
                        <p>Buyer: {payment.buyer_display_name ?? "—"}</p>
                        <p className="mt-0.5">
                          Farmer: {payment.farmer_display_name ?? "—"}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-deep-navy">
                        {payment.currency}{" "}
                        {payment.amount.toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-5 py-3.5">
                        {statusBadge(payment.status)}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-deep-navy/60">
                        {new Date(payment.created_at).toLocaleString()}
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
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-44 rounded-xl bg-deep-navy/10" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-white shadow-sm" />
        ))}
      </div>
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

export default function AdminPaymentsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PaymentsContent />
    </Suspense>
  );
}
