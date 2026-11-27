"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { adminApi, toArray, type PaginatedAdminAuditLogs } from "@/lib/api";
import { Badge, Button, Input, Pagination, Select, Spinner } from "@/components/ui";

const PAGE_SIZE = 20;

const KNOWN_ACTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All actions" },
  { value: "user.suspend", label: "User suspended" },
  { value: "user.reactivate", label: "User reactivated" },
  { value: "transporter.reject", label: "Transporter rejected" },
  { value: "listing.hide", label: "Listing hidden" },
  { value: "listing.restore", label: "Listing restored" },
];

const KNOWN_ENTITY_TYPES: Array<{ value: string; label: string }> = [
  { value: "", label: "All entities" },
  { value: "user", label: "User" },
  { value: "transporter_profile", label: "Transporter" },
  { value: "produce_listing", label: "Listing" },
];

export default function AdminAuditLogsPage() {
  const { token, loading: authLoading, error: authError } =
    useDashboardAuth("admin");

  const [data, setData] = useState<PaginatedAdminAuditLogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [actionInput, setActionInput] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

    const loadLogs = useCallback(async () => {
    if (!token) return null;
    const res = await adminApi.listAuditLogs(token, {
      page,
      limit: PAGE_SIZE,
      action: action || undefined,
      entity_type: entityType || undefined,
    });
    return res.data;
  }, [token, page, action, entityType]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    loadLogs()
      .then((result) => {
        if (!active || !result) return;
        setData(result);
        setLoadError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load audit logs.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, loadLogs]);

  function refresh() {
    setLoading(true);
    setLoadError("");
  }


  function handleSearch(e: FormEvent) {
    e.preventDefault();
    refresh();
    setPage(1);
    setAction(actionInput.trim());
  }

  function resetFilters() {
    refresh();
    setActionInput("");
    setAction("");
    setEntityType("");
    setPage(1);
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
          Audit logs
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Append-only record of administrative actions taken on the platform.
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

      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            aria-label="Filter by action"
            placeholder="Filter by exact action (e.g. user.suspend)"
            value={actionInput}
            onChange={(e) => setActionInput(e.target.value)}
          />
        </div>
        <div className="sm:w-56">
          <Select
            aria-label="Filter by known action"
            options={KNOWN_ACTIONS}
            value={action}
            onChange={(e) => {
              if (e.target.value === action) return;
              refresh();
              setAction(e.target.value);
              setActionInput(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="sm:w-52">
          <Select
            aria-label="Filter by entity type"
            options={KNOWN_ENTITY_TYPES}
            value={entityType}
            onChange={(e) => {
              if (e.target.value === entityType) return;
              refresh();
              setEntityType(e.target.value);
            setPage(1);
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="md">
            Apply
          </Button>
          <Button type="button" variant="ghost" size="md" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-deep-navy/10 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-deep-navy/55">
            <Spinner /> Loading audit logs…
          </div>
        ) : !data || toArray(data.logs).length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-heading text-base font-bold text-deep-navy">
              No audit entries found
            </p>
            <p className="mt-1.5 text-sm text-deep-navy/55">
              Administrative actions will appear here as they happen.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-deep-navy/5">
              {toArray(data.logs).map((log) => (
                <li key={log.id} className="p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-deep-navy">
                          {log.action}
                        </span>
                        <Badge variant="navy" size="sm">
                          {log.entity_type}
                        </Badge>
                        {log.result && (
                          <Badge
                            variant={log.result === "success" ? "green" : "red"}
                            size="sm"
                          >
                            {log.result}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-deep-navy/55">
                        By {log.admin_display_name ?? "Administrator"} ·{" "}
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                      {log.reason && (
                        <p className="mt-2 rounded-xl bg-soft-bg px-3 py-2 text-xs text-deep-navy/70">
                          {log.reason}
                        </p>
                      )}
                      {log.entity_id && (
                        <p className="mt-1 text-xs text-deep-navy/45">
                          Entity: {log.entity_id}
                        </p>
                      )}
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpanded(expanded === log.id ? null : log.id)
                        }
                      >
                        {expanded === log.id ? "Hide details" : "Details"}
                      </Button>
                    )}
                  </div>
                  {expanded === log.id && log.metadata && (
                    <pre className="mt-3 overflow-x-auto rounded-xl bg-deep-navy px-4 py-3 text-xs text-white">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
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
      <div className="h-24 rounded-2xl bg-white shadow-sm" />
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
