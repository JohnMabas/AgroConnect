"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  adminApi,
  toArray,
  type AdminUserDetail,
  type AdminUserRole,
  type AdminUserSummary,
  type ApiError,
  type PaginatedAdminUsers,
} from "@/lib/api";
import { Badge, Button, Input, Pagination, Select, Spinner } from "@/components/ui";

const PAGE_SIZE = 20;

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All roles" },
  { value: "farmer", label: "Farmers" },
  { value: "buyer", label: "Buyers" },
  { value: "cooperative", label: "Cooperatives" },
  { value: "cooperative_agent", label: "Cooperative agents" },
  { value: "transporter", label: "Transporters" },
  { value: "admin", label: "Administrators" },
];

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
];

function statusBadge(status: string) {
  if (status === "active") return <Badge variant="green" size="sm">Active</Badge>;
  if (status === "suspended") return <Badge variant="red" size="sm">Suspended</Badge>;
  return <Badge variant="gold" size="sm">Pending</Badge>;
}

export default function AdminUsersPage() {
  const { token, loading: authLoading, error: authError } =
    useDashboardAuth("admin");

  const [data, setData] = useState<PaginatedAdminUsers | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modal, setModal] = useState<"suspend" | "reactivate" | null>(null);
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadUsers = useCallback(async () => {
    if (!token) return null;
    const res = await adminApi.listUsers(token, {
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      role: (role || undefined) as AdminUserRole | undefined,
      status: (status || undefined) as "active" | "pending" | "suspended" | undefined,
    });
    return res.data;
  }, [token, page, search, role, status]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    loadUsers()
      .then((result) => {
        if (!active || !result) return;
        setData(result);
        setLoadError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load users.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, loadUsers]);

  function refresh() {
    setLoading(true);
    setLoadError("");
  }

  async function reload() {
    try {
      const result = await loadUsers();
      if (result) {
        setData(result);
        setLoadError("");
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load users.",
      );
    } finally {
      setLoading(false);
    }
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
    setRole("");
    setStatus("");
    setPage(1);
  }

  async function openDetail(
    user: AdminUserSummary,
    nextModal: "suspend" | "reactivate" | null = null,
  ) {
    if (!token) return;
    setDetailLoading(true);
    setModal(null);
    setDetail(null);
    try {
      const res = await adminApi.getUser(token, user.id);
      setDetail(res.data.user);
      if (nextModal) {
        setReason("");
        setActionError("");
        setModal(nextModal);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load user details.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function applyStatusChange() {
    if (!token || !detail) return;
    setActionError("");
    if (modal === "suspend" && reason.trim().length < 3) {
      setActionError("A suspension reason of at least 3 characters is required.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await adminApi.updateUserStatus(
        token,
        detail.id,
        modal === "suspend" ? "suspended" : "active",
        modal === "suspend" ? reason.trim() : undefined,
      );
      setDetail(res.data.user);
      setFeedback(res.message);
      setModal(null);
      setReason("");
      await reload();
    } catch (err) {
      setActionError((err as ApiError).message ?? "Failed to update the account.");
    } finally {
      setActionLoading(false);
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
          Users
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Search every account, inspect roles and verification, and suspend or
          reactivate access.
        </p>
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
        >
          {feedback}
        </div>
      )}
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
            aria-label="Search users"
            placeholder="Search by name, email or phone number"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="sm:w-52">
          <Select
            aria-label="Filter by role"
            options={ROLE_OPTIONS}
            value={role}
            onChange={(e) => {
              if (e.target.value === role) return;
              refresh();
              setRole(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="sm:w-48">
          <Select
            aria-label="Filter by status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => {
              if (e.target.value === status) return;
              refresh();
              setStatus(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="md">
            Search
          </Button>
          <Button type="button" variant="ghost" size="md" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-deep-navy/10 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-deep-navy/55">
            <Spinner /> Loading users…
          </div>
        ) : !data || toArray(data.users).length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-heading text-base font-bold text-deep-navy">
              No users found
            </p>
            <p className="mt-1.5 text-sm text-deep-navy/55">
              Try adjusting your search or filters.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 rounded-full bg-agro-green px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-deep-navy/10 bg-soft-bg/60 text-xs uppercase tracking-wider text-deep-navy/50">
                    <th className="px-5 py-3 font-semibold">Account</th>
                    <th className="px-5 py-3 font-semibold">Roles</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Joined</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-deep-navy/5">
                  {toArray(data.users).map((user) => (
                    <tr key={user.id} className="align-top">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-deep-navy">
                          {user.display_name ?? "Unnamed account"}
                        </p>
                        <p className="mt-0.5 text-xs text-deep-navy/55">
                          {user.email ?? user.phone_number ?? "No contact on file"}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {user.roles.map((roleName) => (
                            <Badge key={roleName} variant="navy" size="sm">
                              {roleName.replace("_", " ")}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">{statusBadge(user.status)}</td>
                      <td className="px-5 py-3.5 text-xs text-deep-navy/60">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void openDetail(user)}
                          >
                            View
                          </Button>
                          {user.status !== "suspended" &&
                            !user.roles.includes("admin") && (
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => void openDetail(user, "suspend")}
                              >
                                Suspend
                              </Button>
                            )}
                        </div>
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

      {/* Detail drawer */}
      {(detailLoading || detail) && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-deep-navy/40 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="User details"
          onClick={() => {
            if (!actionLoading) setDetail(null);
          }}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading || !detail ? (
              <div className="flex items-center justify-center gap-3 py-10 text-sm text-deep-navy/55">
                <Spinner /> Loading account…
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-lg font-extrabold text-deep-navy">
                      {detail.display_name ?? "Unnamed account"}
                    </h2>
                    <p className="mt-0.5 text-sm text-deep-navy/60">
                      {detail.email ?? detail.phone_number ?? "No contact on file"}
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
                    <dd>{statusBadge(detail.status)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-deep-navy/50">Email</dt>
                    <dd className="truncate text-right">
                      {detail.email ?? "—"}{" "}
                      {detail.email && (
                        <span className="ml-1">
                          {detail.email_verified ? (
                            <Badge variant="green" size="sm">verified</Badge>
                          ) : (
                            <Badge variant="gold" size="sm">unverified</Badge>
                          )}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-deep-navy/50">Phone</dt>
                    <dd className="truncate text-right">
                      {detail.phone_number ?? "—"}{" "}
                      {detail.phone_number && (
                        <span className="ml-1">
                          {detail.phone_verified ? (
                            <Badge variant="green" size="sm">verified</Badge>
                          ) : (
                            <Badge variant="gold" size="sm">unverified</Badge>
                          )}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-deep-navy/50">Roles</dt>
                    <dd className="flex flex-wrap justify-end gap-1.5">
                      {detail.roles.map((roleName) => (
                        <Badge key={roleName} variant="navy" size="sm">
                          {roleName.replace("_", " ")}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                  {detail.profile && (
                    <>
                      <div className="flex justify-between gap-4">
                        <dt className="text-deep-navy/50">Name on profile</dt>
                        <dd className="truncate text-right">
                          {[detail.profile.first_name, detail.profile.last_name]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-deep-navy/50">Location</dt>
                        <dd className="truncate text-right">
                          {[
                            detail.profile.city_or_community,
                            detail.profile.local_government_area,
                            detail.profile.state_or_region,
                          ]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </dd>
                      </div>
                    </>
                  )}
                  {detail.farmer_verification_status && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-deep-navy/50">Farmer verification</dt>
                      <dd className="capitalize">
                        {detail.farmer_verification_status.replace("_", " ")}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-deep-navy/50">Joined</dt>
                    <dd>{new Date(detail.created_at).toLocaleString()}</dd>
                  </div>
                </dl>

                {!detail.roles.includes("admin") && (
                  <div className="mt-6 flex justify-end gap-2 border-t border-deep-navy/10 pt-4">
                    {detail.status === "suspended" ? (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setReason("");
                          setActionError("");
                          setModal("reactivate");
                        }}
                      >
                        Reactivate account
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setReason("");
                          setActionError("");
                          setModal("suspend");
                        }}
                      >
                        Suspend account
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Suspend / reactivate confirmation */}
      {modal && detail && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-deep-navy/40 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={modal === "suspend" ? "Suspend account" : "Reactivate account"}
          onClick={() => {
            if (!actionLoading) setModal(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-heading text-lg font-extrabold text-deep-navy">
              {modal === "suspend" ? "Suspend account" : "Reactivate account"}
            </h2>
            <p className="mt-1 text-sm text-deep-navy/60">
              {modal === "suspend"
                ? `"${detail.display_name ?? detail.email ?? detail.phone_number}" will be blocked from signing in.`
                : `"${detail.display_name ?? detail.email ?? detail.phone_number}" will be able to sign in again.`}
            </p>

            {actionError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            )}

            {modal === "suspend" && (
              <div className="mt-4">
                <label
                  htmlFor="suspend-reason"
                  className="mb-1.5 block text-sm font-semibold text-deep-navy"
                >
                  Reason <span className="font-normal text-deep-navy/45">(recorded in the audit log)</span>
                </label>
                <textarea
                  id="suspend-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this account being suspended?"
                  className="w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
                />
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={actionLoading}
                onClick={() => setModal(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={modal === "suspend" ? "danger" : "primary"}
                size="sm"
                loading={actionLoading}
                onClick={() => void applyStatusChange()}
              >
                {modal === "suspend" ? "Suspend" : "Reactivate"}
              </Button>
            </div>
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
