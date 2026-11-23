"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { buyerRequestsApi, type BuyerRequestData, type ApiError } from "@/lib/api";
import { getUserIdFromToken } from "@/lib/session";
import { resolveConversationForContext } from "@/lib/messaging";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(value: number, currency: string): string {
  if (currency === "NGN") return `₦${value.toLocaleString()}`;
  return `${currency} ${value.toLocaleString()}`;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(
      new Date(`${value}T00:00:00`),
    );
  } catch { return value; }
}

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch { return value; }
}

function getProduceName(r: BuyerRequestData): string {
  return r.produce_type?.name ?? r.produce_category?.name ?? "Agricultural produce";
}

function isContactable(request: BuyerRequestData): boolean {
  if (request.status !== "open") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${request.expiry_date}T00:00:00`);
  return !Number.isNaN(expiry.getTime()) && expiry >= today;
}

// ─── Status ───────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  open: "bg-fresh-green/15 text-agro-green",
  paused: "bg-harvest-gold/15 text-amber-700",
  fulfilled: "bg-deep-navy/8 text-deep-navy/55",
  cancelled: "bg-red-50 text-red-600",
  expired: "bg-deep-navy/6 text-deep-navy/40",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open", paused: "Paused", fulfilled: "Fulfilled",
  cancelled: "Cancelled", expired: "Expired",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-6">
      <div className="h-4 w-32 rounded bg-deep-navy/8" />
      <div className="h-8 w-2/3 rounded-xl bg-deep-navy/8" />
      <div className="grid gap-4 md:grid-cols-2">
        {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-deep-navy/6" />)}
      </div>
    </div>
  );
}

// ─── Login prompt ─────────────────────────────────────────────────────────────

function LoginPrompt({ requestId }: { requestId: string }) {
  return (
    <div className="rounded-2xl border border-agro-green/20 bg-agro-green/5 p-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-agro-green/10">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 text-agro-green" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <p className="font-heading text-base font-bold text-deep-navy">Sign in to respond</p>
      <p className="mt-1 text-sm text-deep-navy/60">Create a free account or sign in to respond to this buyer request.</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href={`/login?redirect=/buyer-requests/${requestId}`} className="rounded-full bg-agro-green px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-deep-navy">Sign In</Link>
        <Link href="/register" className="rounded-full border border-agro-green/30 px-6 py-2.5 text-sm font-bold text-agro-green transition-colors hover:bg-agro-green hover:text-white">Create Free Account</Link>
      </div>
    </div>
  );
}

// ─── Action button ─────────────────────────────────────────────────────────────

function ActionBtn({ label, onClick, busy, variant = "default" }: {
  label: string; onClick: () => void; busy: boolean;
  variant?: "default" | "danger" | "primary";
}) {
  const cls = {
    default: "border border-deep-navy/20 text-deep-navy/70 hover:bg-deep-navy/5",
    danger: "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
    primary: "bg-agro-green text-white hover:bg-deep-navy",
  }[variant];
  return (
    <button type="button" disabled={busy} onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${cls}`}>
      {busy ? "…" : label}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BuyerRequestDetailClient({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [request, setRequest] = useState<BuyerRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [contacting, setContacting] = useState(false);
  const [contactError, setContactError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = sessionStorage.getItem("access_token");
    setToken(t);
    if (t) setCurrentUserId(getUserIdFromToken(t));
  }, []);

  const loadRequest = useCallback(async (tok: string | null, id: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await buyerRequestsApi.getById(tok, id);
      setRequest(res.data.request);
    } catch (err) {
      const e = err as ApiError;
      setError(e.status === 404 ? "This request is not available." : e.message || "Failed to load request.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequest(token, requestId);
  }, [requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function doAction(action: "pause" | "reopen" | "fulfill" | "cancel") {
    if (!token) return;
    if ((action === "fulfill" || action === "cancel") &&
      !confirm(action === "fulfill" ? "Mark this request as fulfilled?" : "Cancel this request?")) return;
    setBusy(true);
    setActionError("");
    try {
      const res = await buyerRequestsApi[action](token, requestId);
      setRequest(res.data.request);
    } catch (err) {
      setActionError((err as ApiError).message || `Failed to ${action} request.`);
    } finally {
      setBusy(false);
    }
  }

  async function handleContact() {
    if (!token || !currentUserId || !request) return;
    if (request.buyer_user_id === currentUserId) {
      setContactError("This is your own request.");
      return;
    }
    setContacting(true);
    setContactError("");
    try {
      const conversationId = await resolveConversationForContext(token, {
        participant_user_id: request.buyer_user_id,
        buyer_request_id: request.id,
      });
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      setContactError(
        err instanceof Error ? err.message : "Could not start a conversation.",
      );
    } finally {
      setContacting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1 bg-soft-bg">
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10"><PageSkeleton /></div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1 bg-soft-bg">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-xl rounded-2xl border border-red-100 bg-white p-10 text-center shadow-sm">
              <h1 className="font-heading text-xl font-bold text-deep-navy">Request unavailable</h1>
              <p className="mt-2 text-sm text-deep-navy/60">{error || "This request could not be found."}</p>
              <Link href="/buyer-requests" className="mt-6 inline-block rounded-full bg-agro-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy">← Back to Buyer Requests</Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const isOwner = !!(token && currentUserId && request.buyer_user_id === currentUserId);
  const isAuthenticated = !!token;
  const produceName = getProduceName(request);
  const locationParts = [request.community, request.local_government_area, request.state_or_region, request.country].filter(Boolean);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main id="main" className="flex-1 bg-soft-bg">
        {/* Breadcrumb */}
        <div className="border-b border-deep-navy/8 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-3 sm:px-8 lg:px-10">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-deep-navy/50">
              <Link href="/buyer-requests" className="transition-colors hover:text-agro-green">Buyer Requests</Link>
              <svg aria-hidden="true" viewBox="0 0 6 10" className="h-2.5 w-2.5 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l4 4-4 4" /></svg>
              <span className="max-w-xs truncate text-deep-navy/80">{produceName}</span>
            </nav>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main detail card */}
            <article className="lg:col-span-2 rounded-2xl border border-deep-navy/8 bg-white p-6 shadow-sm md:p-8">
              {/* Status + category */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[request.status] ?? "bg-deep-navy/8 text-deep-navy/55"}`}>
                  {STATUS_LABEL[request.status] ?? request.status}
                </span>
                {request.produce_type?.category?.name && (
                  <span className="rounded-full bg-agro-green/10 px-2.5 py-1 text-xs font-semibold text-agro-green">{request.produce_type.category.name}</span>
                )}
                {!request.produce_type && request.produce_category?.name && (
                  <span className="rounded-full bg-agro-green/10 px-2.5 py-1 text-xs font-semibold text-agro-green">{request.produce_category.name}</span>
                )}
              </div>

              <h1 className="mt-3 font-heading text-2xl font-extrabold text-deep-navy sm:text-3xl">{produceName}</h1>

              {/* Quantity */}
              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-heading text-4xl font-extrabold text-agro-green">
                  {Number(request.requested_quantity).toLocaleString()}
                </span>
                <span className="text-lg text-deep-navy/60">{request.unit} needed</span>
              </div>

              {/* Price */}
              {request.target_price_per_unit ? (
                <p className="mt-2 text-base text-deep-navy/70">
                  Target price: <strong className="text-deep-navy">{formatMoney(request.target_price_per_unit, request.currency)}/{request.unit}</strong>
                </p>
              ) : (
                <p className="mt-2 text-sm text-deep-navy/40">No target price — open to offers</p>
              )}

              {/* Additional requirements */}
              {request.additional_requirements && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-deep-navy/50">Requirements</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-deep-navy/70">{request.additional_requirements}</p>
                </div>
              )}

              {/* Detail grid */}
              <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2">
                {locationParts.length > 0 && (
                  <div className="col-span-2 rounded-xl border border-deep-navy/8 bg-soft-bg px-3 py-2.5">
                    <dt className="flex items-center gap-1.5 text-xs text-deep-navy/50">
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 text-agro-green" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                      Delivery location
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold text-deep-navy">{locationParts.join(", ")}</dd>
                    {request.preferred_location && request.preferred_location !== locationParts.join(", ") && (
                      <dd className="mt-0.5 text-xs text-deep-navy/55">{request.preferred_location}</dd>
                    )}
                  </div>
                )}
                {request.required_delivery_date && (
                  <div className="rounded-xl border border-deep-navy/8 bg-soft-bg px-3 py-2.5">
                    <dt className="text-xs text-deep-navy/50">Delivery needed by</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-deep-navy">{formatDate(request.required_delivery_date)}</dd>
                  </div>
                )}
                <div className="rounded-xl border border-deep-navy/8 bg-soft-bg px-3 py-2.5">
                  <dt className="text-xs text-deep-navy/50">Request expires</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-deep-navy">{formatDate(request.expiry_date)}</dd>
                </div>
                {request.buyer?.display_name && (
                  <div className="rounded-xl border border-deep-navy/8 bg-soft-bg px-3 py-2.5">
                    <dt className="text-xs text-deep-navy/50">Buyer</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-deep-navy">{request.buyer.display_name}</dd>
                  </div>
                )}
              </dl>

              <p className="mt-5 text-xs text-deep-navy/40">
                Posted {formatDateTime(String(request.created_at))}
                {String(request.updated_at) !== String(request.created_at) && ` · Updated ${formatDateTime(String(request.updated_at))}`}
              </p>
            </article>

            {/* Action panel */}
            <aside className="space-y-4">
              {actionError && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>
              )}

              {isOwner ? (
                <div className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm">
                  <p className="font-heading text-sm font-bold text-deep-navy">Manage your request</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(request.status === "open" || request.status === "paused") && (
                      <Link href={`/buyer-requests/${request.id}/edit`}
                        className="rounded-full border border-deep-navy/20 px-4 py-2 text-xs font-semibold text-deep-navy/70 transition-colors hover:bg-deep-navy/5">
                        Edit
                      </Link>
                    )}
                    {request.status === "open" && (
                      <ActionBtn label="Pause" busy={busy} onClick={() => void doAction("pause")} />
                    )}
                    {request.status === "paused" && (
                      <ActionBtn label="Reopen" busy={busy} variant="primary" onClick={() => void doAction("reopen")} />
                    )}
                    {(request.status === "open" || request.status === "paused") && (
                      <>
                        <ActionBtn label="Mark Fulfilled" busy={busy} variant="primary" onClick={() => void doAction("fulfill")} />
                        <ActionBtn label="Cancel" busy={busy} variant="danger" onClick={() => void doAction("cancel")} />
                      </>
                    )}
                    {(request.status === "fulfilled" || request.status === "cancelled" || request.status === "expired") && (
                      <p className="text-xs text-deep-navy/50">This request is {request.status} and can no longer be modified.</p>
                    )}
                  </div>
                </div>
              ) : isAuthenticated ? (
                <div className="rounded-2xl border border-deep-navy/8 bg-white p-5 shadow-sm">
                  <p className="font-heading text-sm font-bold text-deep-navy">Respond to this request</p>
                  {request.status === "open" ? (
                    <div className="mt-4 space-y-2">
                      {isContactable(request) && (
                        <Link href={`/offers/new?buyerRequestId=${request.id}`}
                          className="flex w-full items-center justify-center gap-2 rounded-full bg-agro-green py-3 text-sm font-bold text-white transition-colors hover:bg-deep-navy">
                          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                          Make offer
                        </Link>
                      )}
                      {contactError && (
                        <p role="alert" className="text-xs text-red-700">{contactError}</p>
                      )}
                      <button type="button"
                        disabled={contacting || !isContactable(request)}
                        className="flex w-full items-center justify-center gap-2 rounded-full border border-agro-green/30 py-2.5 text-sm font-semibold text-agro-green transition-colors hover:bg-agro-green/8 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => void handleContact()}>
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                        {contacting ? "Opening conversation…" : "Contact Buyer"}
                      </button>
                      {!isContactable(request) && (
                        <p className="text-xs text-center text-deep-navy/50">
                          This request is no longer accepting responses.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-deep-navy/8 bg-soft-bg p-3 text-center">
                      <p className="text-sm text-deep-navy/60">This request is <strong>{request.status}</strong> and is not accepting responses.</p>
                    </div>
                  )}
                </div>
              ) : (
                <LoginPrompt requestId={requestId} />
              )}

              <Link href="/buyer-requests"
                className="flex w-full items-center justify-center gap-2 rounded-full border border-deep-navy/15 py-2.5 text-sm font-semibold text-deep-navy/70 transition-colors hover:border-agro-green/30 hover:text-agro-green">
                ← Back to Buyer Requests
              </Link>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
