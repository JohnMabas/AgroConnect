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
  integrityAdminApi,
  toArray,
  type ApiError,
  type IntegrityAssessmentData,
  type IntegrityReviewAction,
  type IntegrityReviewStatus,
  type PaginatedIntegrityAssessments,
} from "@/lib/api";
import { Badge, Button, Pagination, Select, Spinner } from "@/components/ui";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All review statuses" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under review" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
  { value: "false_positive", label: "False positive" },
];

const RISK_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All risk levels" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "risk_desc", label: "Highest risk first" },
];

const ACTION_LABEL: Record<IntegrityReviewAction, string> = {
  start_review: "Start review",
  resolve: "Resolve",
  mark_false_positive: "Mark false positive",
  escalate: "Escalate",
  add_note: "Add note",
};

function riskBadge(level: string) {
  if (level === "critical") return <Badge variant="red" size="sm">Critical</Badge>;
  if (level === "high") return <Badge variant="gold" size="sm">High</Badge>;
  if (level === "medium") return <Badge variant="navy" size="sm">Medium</Badge>;
  return <Badge variant="gray" size="sm">Low</Badge>;
}

function statusBadge(status: string) {
  if (status === "pending") return <Badge variant="gold" size="sm">Pending</Badge>;
  if (status === "under_review") return <Badge variant="navy" size="sm">Under review</Badge>;
  if (status === "escalated") return <Badge variant="red" size="sm">Escalated</Badge>;
  if (status === "false_positive") return <Badge variant="gray" size="sm">False positive</Badge>;
  return <Badge variant="green" size="sm">Resolved</Badge>;
}

function availableActions(status: IntegrityReviewStatus): IntegrityReviewAction[] {
  if (status === "pending") return ["start_review", "resolve", "mark_false_positive", "escalate"];
  if (status === "under_review") return ["resolve", "mark_false_positive", "escalate", "add_note"];
  if (status === "escalated") return ["start_review", "resolve", "mark_false_positive", "add_note"];
  return [];
}

function IntegrityContent() {
  const searchParams = useSearchParams();
  const { token, loading: authLoading, error: authError } =
    useDashboardAuth("admin");

  const [data, setData] = useState<PaginatedIntegrityAssessments | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [reviewStatus, setReviewStatus] = useState(() => {
    const initial = searchParams.get("review_status") ?? "";
    return STATUS_OPTIONS.some((option) => option.value === initial)
      ? initial
      : "";
  });
  const [riskLevel, setRiskLevel] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const [modalAction, setModalAction] = useState<IntegrityReviewAction | null>(null);
  const [selected, setSelected] = useState<IntegrityAssessmentData | null>(null);
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadAssessments = useCallback(async () => {
    if (!token) return null;
    const res = await integrityAdminApi.list(token, {
      page,
      limit: PAGE_SIZE,
      review_status: (reviewStatus || undefined) as IntegrityReviewStatus | undefined,
      risk_level: (riskLevel || undefined) as
        | "low"
        | "medium"
        | "high"
        | "critical"
        | undefined,
      sort: sort as "newest" | "risk_desc",
    });
    return res.data;
  }, [token, page, reviewStatus, riskLevel, sort]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    loadAssessments()
      .then((result) => {
        if (!active || !result) return;
        setData(result);
        setLoadError("");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load assessments.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, loadAssessments]);

  function refresh() {
    setLoading(true);
    setLoadError("");
  }

  async function reload() {
    try {
      const result = await loadAssessments();
      if (result) {
        setData(result);
        setLoadError("");
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load assessments.",
      );
    } finally {
      setLoading(false);
    }
  }

  function openAction(action: IntegrityReviewAction, assessment: IntegrityAssessmentData) {
    setSelected(assessment);
    setNotes("");
    setActionError("");
    setModalAction(action);
  }

  async function submitAction(e: FormEvent) {
    e.preventDefault();
    if (!token || !selected || !modalAction) return;
    if (
      modalAction !== "start_review" &&
      notes.trim().length < 3
    ) {
      setActionError("Provide notes with at least 3 characters for this action.");
      return;
    }
    setActionLoading(true);
    setActionError("");
    try {
      await integrityAdminApi.review(token, selected.id, {
        action: modalAction,
        notes: notes.trim() || undefined,
        ...(modalAction === "mark_false_positive" ? { false_positive: true } : {}),
      });
      setFeedback(`${ACTION_LABEL[modalAction]} recorded.`);
      setModalAction(null);
      setSelected(null);
      setNotes("");
      await reload();
    } catch (err) {
      setActionError(
        (err as ApiError).message ?? "Failed to record the review action.",
      );
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
          Integrity alerts
        </h1>
        <p className="mt-1 text-sm text-deep-navy/60">
          Review AI-detected risk signals and record investigation outcomes.
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

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="sm:w-56">
          <Select
            aria-label="Filter by review status"
            options={STATUS_OPTIONS}
            value={reviewStatus}
            onChange={(e) => {
              if (e.target.value === reviewStatus) return;
              refresh();
              setReviewStatus(e.target.value);
            setPage(1);
            }}
          />
        </div>
        <div className="sm:w-48">
          <Select
            aria-label="Filter by risk level"
            options={RISK_OPTIONS}
            value={riskLevel}
            onChange={(e) => {
              if (e.target.value === riskLevel) return;
              refresh();
              setRiskLevel(e.target.value);
            setPage(1);
            }}
          />
        </div>
        <div className="sm:w-52">
          <Select
            aria-label="Sort assessments"
            options={SORT_OPTIONS}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-deep-navy/10 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-deep-navy/55">
            <Spinner /> Loading assessments…
          </div>
        ) : !data || toArray(data.assessments).length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-heading text-base font-bold text-deep-navy">
              No integrity alerts found
            </p>
            <p className="mt-1.5 text-sm text-deep-navy/55">
              Try adjusting your filters.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-deep-navy/5">
              {toArray(data.assessments).map((assessment) => {
                const actions = availableActions(assessment.review_status);
                return (
                  <li key={assessment.id} className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-deep-navy">
                            {assessment.risk_category.replace(/_/g, " ")}
                          </h3>
                          {riskBadge(assessment.risk_level)}
                          {statusBadge(assessment.review_status)}
                          <Badge variant="navy" size="sm">
                            score {assessment.risk_score}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-deep-navy/55">
                          Subject:{" "}
                          {assessment.subject_display_name ??
                            assessment.subject_user_id}
                          {assessment.related_entity_type
                            ? ` · ${assessment.related_entity_type}`
                            : ""}
                        </p>
                        {assessment.reasons.length > 0 && (
                          <ul className="mt-2 space-y-0.5">
                            {assessment.reasons.slice(0, 3).map((reason, index) => (
                              <li
                                key={`${assessment.id}-reason-${index}`}
                                className="text-xs text-deep-navy/65"
                              >
                                • {reason.message}
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="mt-1 text-xs text-deep-navy/45">
                          Detected {new Date(assessment.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {actions.map((action) => (
                          <Button
                            key={action}
                            type="button"
                            variant={
                              action === "resolve"
                                ? "primary"
                                : action === "mark_false_positive"
                                  ? "outline"
                                  : "ghost"
                            }
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => openAction(action, assessment)}
                          >
                            {ACTION_LABEL[action]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </li>
                );
              })}
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

      {modalAction && selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-deep-navy/40 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={ACTION_LABEL[modalAction]}
          onClick={() => {
            if (!actionLoading) setModalAction(null);
          }}
        >
          <form
            onSubmit={submitAction}
            className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-heading text-lg font-extrabold text-deep-navy">
              {ACTION_LABEL[modalAction]}
            </h2>
            <p className="mt-1 text-sm text-deep-navy/60">
              {selected.risk_category.replace(/_/g, " ")} ·{" "}
              {selected.risk_level} risk
            </p>

            {actionError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            )}

            <div className="mt-4">
              <label
                htmlFor="integrity-notes"
                className="mb-1.5 block text-sm font-semibold text-deep-navy"
              >
                Notes{" "}
                <span className="font-normal text-deep-navy/45">
                  {modalAction === "start_review"
                    ? "(optional)"
                    : "(required, recorded in the review history)"}
                </span>
              </label>
              <textarea
                id="integrity-notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you find?"
                className="w-full rounded-xl border border-deep-navy/20 bg-white px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/35 outline-none transition-colors focus:border-agro-green focus:ring-2 focus:ring-agro-green/30"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={actionLoading}
                onClick={() => setModalAction(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={modalAction === "mark_false_positive" ? "outline" : "primary"}
                size="sm"
                loading={actionLoading}
              >
                Confirm
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-52 rounded-xl bg-deep-navy/10" />
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

export default function AdminIntegrityPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <IntegrityContent />
    </Suspense>
  );
}
