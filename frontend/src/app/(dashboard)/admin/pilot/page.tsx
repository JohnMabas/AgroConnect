"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  pilotApi,
  type ApiError,
  type PilotConfigurationData,
  type PilotFeedbackData,
  type PilotMetrics,
  type PilotParticipantData,
  type PilotReadinessModule,
  type PilotReadinessReport,
} from "@/lib/api";

type Tab = "readiness" | "participants" | "feedback" | "metrics" | "settings";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "readiness", label: "Readiness" },
  { key: "participants", label: "Participants" },
  { key: "feedback", label: "Feedback" },
  { key: "metrics", label: "Metrics" },
  { key: "settings", label: "Pilot settings" },
];

const RECOMMENDATION_STYLES: Record<string, string> = {
  NOT_READY: "bg-red-100 text-red-700 border-red-200",
  INTERNAL_TESTING_READY:
    "bg-harvest-gold/10 text-harvest-gold border-harvest-gold/30",
  CONTROLLED_PILOT_READY:
    "bg-green-100 text-green-700 border-green-200",
};

const READINESS_STYLES: Record<string, string> = {
  passed: "bg-green-100 text-green-700",
  ready_for_controlled_pilot: "bg-green-100 text-green-700",
  testing_in_progress: "bg-harvest-gold/10 text-harvest-gold",
  implemented_not_tested: "bg-gray-100 text-gray-600",
  sandbox_tested_only: "bg-blue-100 text-blue-700",
  prepared_awaiting_provider_approval: "bg-purple-100 text-purple-700",
  blocked: "bg-red-100 text-red-700",
  not_implemented: "bg-red-100 text-red-700",
};

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-harvest-gold/10 text-harvest-gold",
  critical: "bg-red-100 text-red-700",
};

const PARTICIPANT_TYPES = [
  "farmer",
  "buyer",
  "cooperative",
  "cooperative_agent",
  "transporter",
  "administrator",
];

const READINESS_OPTIONS = [
  "not_implemented",
  "implemented_not_tested",
  "testing_in_progress",
  "passed",
  "blocked",
  "sandbox_tested_only",
  "prepared_awaiting_provider_approval",
  "ready_for_controlled_pilot",
];

const TESTING_OPTIONS = [
  "implemented_not_tested",
  "testing_in_progress",
  "passed",
  "blocked",
  "sandbox_tested_only",
];

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function StatusPill({
  value,
  styles,
}: {
  value: string;
  styles: Record<string, string>;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value] ?? "bg-gray-100 text-gray-600"}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-deep-navy/10 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-deep-navy/50">
        {label}
      </p>
      <p className="mt-1 font-heading text-2xl font-extrabold text-deep-navy">
        {value}
      </p>
    </div>
  );
}

export default function AdminPilotPage() {
  const {
    token,
    user,
    loading: authLoading,
    error: authError,
  } = useDashboardAuth("admin");

  const [tab, setTab] = useState<Tab>("readiness");
  const [readiness, setReadiness] = useState<PilotReadinessReport | null>(null);
  const [configurations, setConfigurations] = useState<
    PilotConfigurationData[]
  >([]);
  const [participants, setParticipants] = useState<PilotParticipantData[]>([]);
  const [feedback, setFeedback] = useState<PilotFeedbackData[]>([]);
  const [metrics, setMetrics] = useState<PilotMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [criticalOnly, setCriticalOnly] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedModule, setSelectedModule] =
    useState<PilotReadinessModule | null>(null);
  const [overrideReadiness, setOverrideReadiness] =
    useState("testing_in_progress");
  const [overrideTesting, setOverrideTesting] = useState("testing_in_progress");
  const [overrideEvidence, setOverrideEvidence] = useState("");
  const [overrideNotes, setOverrideNotes] = useState("");

  const [configForm, setConfigForm] = useState({
    name: "",
    state_or_region: "Plateau",
    start_date: "",
    end_date: "",
    locations: "",
    is_active: true,
  });

  const [participantForm, setParticipantForm] = useState({
    user_id: "",
    participant_type: "farmer",
    consent_confirmed: true,
    status: "approved",
  });

  const [resolutionDraft, setResolutionDraft] = useState<
    Record<string, string>
  >({});

  const activeConfiguration = useMemo(
    () => configurations.find((configuration) => configuration.is_active) ?? null,
    [configurations],
  );

  const categories = useMemo(() => {
    const values = new Set(
      (readiness?.modules ?? []).map((module) => module.category),
    );
    return Array.from(values).sort();
  }, [readiness]);

  const visibleModules = useMemo(() => {
    return (readiness?.modules ?? []).filter((module) => {
      if (criticalOnly && !module.critical) return false;
      if (categoryFilter && module.category !== categoryFilter) return false;
      return true;
    });
  }, [readiness, criticalOnly, categoryFilter]);

  async function loadAll(accessToken: string) {
    setError("");
    try {
      const [readinessRes, configsRes, feedbackRes] = await Promise.all([
        pilotApi.getReadiness(accessToken),
        pilotApi.listConfigurations(accessToken),
        pilotApi.listFeedback(accessToken),
      ]);
      setReadiness(readinessRes.data);
      setConfigurations(configsRes.data.items);
      setFeedback(feedbackRes.data.items);

      const active =
        configsRes.data.items.find((configuration) => configuration.is_active) ??
        configsRes.data.items[0];
      if (active) {
        const [participantsRes, metricsRes] = await Promise.all([
          pilotApi.listParticipants(accessToken, active.id),
          pilotApi.getMetrics(accessToken, active.id),
        ]);
        setParticipants(participantsRes.data.items);
        setMetrics(metricsRes.data);
      } else {
        setParticipants([]);
        setMetrics(null);
      }
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to load pilot data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const [readinessRes, configsRes, feedbackRes] = await Promise.all([
          pilotApi.getReadiness(token!),
          pilotApi.listConfigurations(token!),
          pilotApi.listFeedback(token!),
        ]);
        setReadiness(readinessRes.data);
        setConfigurations(configsRes.data.items);
        setFeedback(feedbackRes.data.items);

        const active =
          configsRes.data.items.find(
            (configuration) => configuration.is_active,
          ) ?? configsRes.data.items[0];
        if (active) {
          const [participantsRes, metricsRes] = await Promise.all([
            pilotApi.listParticipants(token!, active.id),
            pilotApi.getMetrics(token!, active.id),
          ]);
          setParticipants(participantsRes.data.items);
          setMetrics(metricsRes.data);
        } else {
          setParticipants([]);
          setMetrics(null);
        }
      } catch (err) {
        setError((err as ApiError).message ?? "Failed to load pilot data.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token]);

  async function refreshActive(accessToken: string, configurationId: string) {
    const [participantsRes, metricsRes] = await Promise.all([
      pilotApi.listParticipants(accessToken, configurationId),
      pilotApi.getMetrics(accessToken, configurationId),
    ]);
    setParticipants(participantsRes.data.items);
    setMetrics(metricsRes.data);
  }

  async function handleCreateConfiguration(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await pilotApi.createConfiguration(token, {
        name: configForm.name.trim(),
        state_or_region: configForm.state_or_region.trim() || "Plateau",
        start_date: configForm.start_date || null,
        end_date: configForm.end_date || null,
        locations: configForm.locations
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        is_active: configForm.is_active,
      });
      setConfigurations((previous) => [
        res.data.configuration,
        ...previous.map((configuration) => ({
          ...configuration,
          is_active:
            configuration.is_active && res.data.configuration.is_active
              ? false
              : configuration.is_active,
        })),
      ]);
      setConfigForm({
        name: "",
        state_or_region: "Plateau",
        start_date: "",
        end_date: "",
        locations: "",
        is_active: true,
      });
      setMessage("Pilot configuration created.");
      await loadAll(token);
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to create configuration.");
    } finally {
      setBusy(false);
    }
  }

  async function handleActivate(configuration: PilotConfigurationData) {
    if (!token) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await pilotApi.updateConfiguration(token, configuration.id, {
        is_active: true,
        status: "active",
      });
      setMessage(`"${configuration.name}" is now the active pilot.`);
      await loadAll(token);
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to activate pilot.");
    } finally {
      setBusy(false);
    }
  }

  function openOverride(module: PilotReadinessModule) {
    setSelectedModule(module);
    setOverrideReadiness(module.pilot_readiness);
    setOverrideTesting(module.testing_status);
    setOverrideEvidence("");
    setOverrideNotes("");
    setMessage("");
    setError("");
  }

  async function handleOverride(event: FormEvent) {
    event.preventDefault();
    if (!token || !selectedModule || !activeConfiguration) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await pilotApi.overrideReadiness(
        token,
        activeConfiguration.id,
        selectedModule.key,
        {
          pilot_readiness: overrideReadiness,
          testing_status: overrideTesting,
          evidence: overrideEvidence
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
          notes: overrideNotes.trim() || undefined,
        },
      );
      setReadiness(res.data);
      setMessage(`Evidence recorded for ${selectedModule.name}.`);
      setSelectedModule(null);
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to record evidence.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddParticipant(event: FormEvent) {
    event.preventDefault();
    if (!token || !activeConfiguration) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await pilotApi.addParticipant(token, activeConfiguration.id, {
        user_id: participantForm.user_id.trim(),
        participant_type: participantForm.participant_type,
        status: participantForm.status,
        consent_confirmed: participantForm.consent_confirmed,
        consent_version: "pilot-consent-v1",
      });
      setParticipantForm({
        user_id: "",
        participant_type: "farmer",
        consent_confirmed: true,
        status: "approved",
      });
      setMessage("Pilot participant added.");
      await refreshActive(token, activeConfiguration.id);
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to add participant.");
    } finally {
      setBusy(false);
    }
  }

  async function handleParticipantAction(
    participant: PilotParticipantData,
    action: "consent" | "activate" | "suspend" | "remove",
  ) {
    if (!token || !activeConfiguration) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data =
        action === "consent"
          ? { status: "approved", consent_confirmed: true }
          : action === "activate"
            ? { status: "active" }
            : action === "suspend"
              ? { status: "suspended" }
              : { status: "removed" };
      await pilotApi.updateParticipant(
        token,
        activeConfiguration.id,
        participant.id,
        data,
      );
      setMessage("Participant updated.");
      await refreshActive(token, activeConfiguration.id);
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to update participant.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFeedbackAction(
    item: PilotFeedbackData,
    status: "acknowledged" | "in_progress" | "resolved" | "closed",
  ) {
    if (!token) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await pilotApi.updateFeedback(token, item.id, {
        status,
        assigned_admin_user_id: user?.id ?? null,
        resolution_notes:
          resolutionDraft[item.id]?.trim() || item.resolution_notes,
      });
      setFeedback((previous) =>
        previous.map((entry) =>
          entry.id === item.id ? res.data.feedback : entry,
        ),
      );
      setMessage(`Feedback ${res.data.feedback.feedback_number} updated.`);
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to update feedback.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="h-40 animate-pulse rounded-2xl bg-deep-navy/5" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {authError}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
            Controlled Pilot
          </h1>
          <p className="mt-1 text-sm text-deep-navy/60">
            Evidence-based readiness, participants, feedback and pilot metrics.
          </p>
        </div>
        {activeConfiguration && (
          <div className="rounded-xl border border-deep-navy/10 bg-white px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-deep-navy/50">
              Active pilot
            </p>
            <p className="font-semibold text-deep-navy">
              {activeConfiguration.name}
            </p>
            <p className="text-xs text-deep-navy/60">
              {activeConfiguration.state_or_region},{" "}
              {activeConfiguration.country} ·{" "}
              {formatDate(activeConfiguration.start_date)} to{" "}
              {formatDate(activeConfiguration.end_date)}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === entry.key
                ? "bg-agro-green text-white"
                : "border border-deep-navy/20 text-deep-navy/70 hover:border-agro-green hover:text-agro-green"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="h-40 animate-pulse rounded-2xl bg-deep-navy/5" />
      )}

      {!loading && tab === "readiness" && readiness && (
        <div className="space-y-5">
          <div
            className={`rounded-2xl border p-5 ${RECOMMENDATION_STYLES[readiness.launch_recommendation]}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide">
              Launch gate
            </p>
            <p className="mt-1 font-heading text-xl font-extrabold">
              {readiness.launch_recommendation.replaceAll("_", " ")}
            </p>
            <p className="mt-1 text-sm">{readiness.recommendation_reason}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Modules"
              value={readiness.summary.total_modules}
            />
            <MetricCard
              label="Critical modules"
              value={readiness.summary.critical_modules}
            />
            <MetricCard
              label="Critical blockers"
              value={readiness.summary.critical_blockers.length}
            />
            <MetricCard
              label="Awaiting provider approval"
              value={
                readiness.summary.modules_awaiting_provider_approval.length
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-deep-navy/10 bg-white p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-deep-navy">
              <input
                type="checkbox"
                checked={criticalOnly}
                onChange={(event) => setCriticalOnly(event.target.checked)}
              />
              Critical modules only
            </label>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-lg border border-deep-navy/20 px-3 py-1.5 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {visibleModules.map((module) => (
              <div
                key={module.key}
                className="rounded-xl border border-deep-navy/10 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-heading text-base font-bold text-deep-navy">
                        {module.name}
                      </h2>
                      {module.critical && (
                        <span className="rounded-full bg-deep-navy px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          Critical
                        </span>
                      )}
                      <span className="rounded-full bg-deep-navy/5 px-2 py-0.5 text-[10px] font-semibold uppercase text-deep-navy/60">
                        {module.category}
                      </span>
                      {module.source === "admin_review" && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-purple-700">
                          Admin reviewed
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-xs text-deep-navy/40">
                      {module.key}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openOverride(module)}
                    disabled={!activeConfiguration}
                    className="rounded-lg border border-agro-green px-3 py-1.5 text-xs font-semibold text-agro-green disabled:opacity-40"
                  >
                    Record evidence
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusPill
                    value={module.pilot_readiness}
                    styles={READINESS_STYLES}
                  />
                  <span className="rounded-full bg-deep-navy/5 px-2.5 py-1 text-xs font-medium text-deep-navy/60">
                    testing: {module.testing_status.replaceAll("_", " ")}
                  </span>
                  <span className="rounded-full bg-deep-navy/5 px-2.5 py-1 text-xs font-medium text-deep-navy/60">
                    integration: {module.integration_status.replaceAll("_", " ")}
                  </span>
                </div>

                {module.runtime_notes.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-deep-navy/70">
                    {module.runtime_notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                )}
                {module.known_issues.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-red-700/80">
                    {module.known_issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {selectedModule && (
            <form
              onSubmit={handleOverride}
              className="rounded-2xl border border-agro-green/30 bg-white p-5"
            >
              <h3 className="font-heading text-lg font-bold text-deep-navy">
                Record evidence: {selectedModule.name}
              </h3>
              <p className="mt-1 text-xs text-deep-navy/60">
                Only record a passing status after the evidence has actually
                been produced. Evidence text is stored with the pilot
                configuration.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-deep-navy">
                  Pilot readiness
                  <select
                    value={overrideReadiness}
                    onChange={(event) =>
                      setOverrideReadiness(event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-deep-navy/20 px-3 py-2 text-sm"
                  >
                    {READINESS_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-deep-navy">
                  Testing status
                  <select
                    value={overrideTesting}
                    onChange={(event) =>
                      setOverrideTesting(event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-deep-navy/20 px-3 py-2 text-sm"
                  >
                    {TESTING_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="mt-4 block text-sm font-medium text-deep-navy">
                Evidence (one item per line)
                <textarea
                  value={overrideEvidence}
                  onChange={(event) =>
                    setOverrideEvidence(event.target.value)
                  }
                  rows={3}
                  placeholder="e.g. Manual Paystack test-mode run on 2026-11-17, reference #..."
                  className="mt-1 w-full rounded-lg border border-deep-navy/20 px-3 py-2 text-sm"
                />
              </label>
              <label className="mt-4 block text-sm font-medium text-deep-navy">
                Reviewer notes
                <textarea
                  value={overrideNotes}
                  onChange={(event) => setOverrideNotes(event.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-deep-navy/20 px-3 py-2 text-sm"
                />
              </label>
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-agro-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save evidence
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedModule(null)}
                  className="rounded-lg border border-deep-navy/20 px-4 py-2 text-sm font-semibold text-deep-navy/70"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {!loading && tab === "participants" && (
        <div className="space-y-5">
          {!activeConfiguration ? (
            <p className="rounded-xl bg-harvest-gold/10 px-4 py-3 text-sm text-harvest-gold">
              Create and activate a pilot configuration before adding
              participants.
            </p>
          ) : (
            <>
              <form
                onSubmit={handleAddParticipant}
                className="rounded-2xl border border-deep-navy/10 bg-white p-5"
              >
                <h2 className="font-heading text-lg font-bold text-deep-navy">
                  Add participant
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-sm font-medium text-deep-navy lg:col-span-2">
                    User ID
                    <input
                      required
                      value={participantForm.user_id}
                      onChange={(event) =>
                        setParticipantForm((previous) => ({
                          ...previous,
                          user_id: event.target.value,
                        }))
                      }
                      placeholder="UUID from the user account"
                      className="mt-1 w-full rounded-lg border border-deep-navy/20 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm font-medium text-deep-navy">
                    Participant type
                    <select
                      value={participantForm.participant_type}
                      onChange={(event) =>
                        setParticipantForm((previous) => ({
                          ...previous,
                          participant_type: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-deep-navy/20 px-3 py-2 text-sm"
                    >
                      {PARTICIPANT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-end gap-2 pb-2 text-sm font-medium text-deep-navy">
                    <input
                      type="checkbox"
                      checked={participantForm.consent_confirmed}
                      onChange={(event) =>
                        setParticipantForm((previous) => ({
                          ...previous,
                          consent_confirmed: event.target.checked,
                        }))
                      }
                    />
                    Consent recorded
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-4 rounded-lg bg-agro-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Add participant
                </button>
              </form>

              <div className="overflow-x-auto rounded-2xl border border-deep-navy/10 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-deep-navy/5 text-left text-xs uppercase tracking-wide text-deep-navy/60">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Consent</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((participant) => (
                      <tr
                        key={participant.id}
                        className="border-t border-deep-navy/5"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-deep-navy/70">
                          {participant.user_id}
                        </td>
                        <td className="px-4 py-3">
                          {participant.participant_type.replaceAll("_", " ")}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill
                            value={participant.status}
                            styles={{
                              active: "bg-green-100 text-green-700",
                              approved: "bg-blue-100 text-blue-700",
                              pending_consent:
                                "bg-harvest-gold/10 text-harvest-gold",
                              suspended: "bg-red-100 text-red-700",
                              removed: "bg-gray-100 text-gray-600",
                              invited: "bg-gray-100 text-gray-600",
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 text-xs text-deep-navy/60">
                          {participant.consent_given_at
                            ? `${participant.consent_version ?? "recorded"} · ${formatDate(participant.consent_given_at)}`
                            : "Not recorded"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {participant.status === "pending_consent" && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleParticipantAction(
                                    participant,
                                    "consent",
                                  )
                                }
                                disabled={busy}
                                className="rounded border border-agro-green px-2 py-1 text-xs font-semibold text-agro-green"
                              >
                                Record consent
                              </button>
                            )}
                            {participant.status === "approved" && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleParticipantAction(
                                    participant,
                                    "activate",
                                  )
                                }
                                disabled={busy}
                                className="rounded border border-agro-green px-2 py-1 text-xs font-semibold text-agro-green"
                              >
                                Activate
                              </button>
                            )}
                            {participant.status === "active" && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleParticipantAction(
                                    participant,
                                    "suspend",
                                  )
                                }
                                disabled={busy}
                                className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700"
                              >
                                Suspend
                              </button>
                            )}
                            {participant.status !== "removed" && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleParticipantAction(
                                    participant,
                                    "remove",
                                  )
                                }
                                disabled={busy}
                                className="rounded border border-deep-navy/20 px-2 py-1 text-xs font-semibold text-deep-navy/60"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {participants.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-sm text-deep-navy/50"
                        >
                          No participants yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {!loading && tab === "feedback" && (
        <div className="space-y-3">
          {feedback.length === 0 && (
            <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-deep-navy/50">
              No pilot feedback has been submitted.
            </p>
          )}
          {feedback.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-deep-navy/10 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-deep-navy/50">
                      {item.feedback_number}
                    </span>
                    <StatusPill
                      value={item.severity}
                      styles={SEVERITY_STYLES}
                    />
                    <span className="rounded-full bg-deep-navy/5 px-2 py-0.5 text-xs font-medium text-deep-navy/60">
                      {item.category.replaceAll("_", " ")}
                    </span>
                    <StatusPill
                      value={item.status}
                      styles={{
                        new: "bg-blue-100 text-blue-700",
                        acknowledged: "bg-purple-100 text-purple-700",
                        under_review: "bg-harvest-gold/10 text-harvest-gold",
                        in_progress: "bg-harvest-gold/10 text-harvest-gold",
                        resolved: "bg-green-100 text-green-700",
                        closed: "bg-gray-100 text-gray-600",
                      }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-deep-navy">
                    {item.description}
                  </p>
                  <p className="mt-1 text-xs text-deep-navy/50">
                    {item.participant_type ?? "participant"} · user{" "}
                    <span className="font-mono">{item.user_id}</span> ·{" "}
                    {formatDate(item.created_at)}
                  </p>
                </div>
              </div>
              {item.resolution_notes && (
                <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
                  Resolution: {item.resolution_notes}
                </p>
              )}
              {!["resolved", "closed"].includes(item.status) && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={resolutionDraft[item.id] ?? ""}
                    onChange={(event) =>
                      setResolutionDraft((previous) => ({
                        ...previous,
                        [item.id]: event.target.value,
                      }))
                    }
                    rows={2}
                    placeholder="Resolution notes (optional)"
                    className="w-full rounded-lg border border-deep-navy/20 px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void handleFeedbackAction(item, "acknowledged")
                      }
                      disabled={busy}
                      className="rounded border border-deep-navy/20 px-3 py-1.5 text-xs font-semibold text-deep-navy/70"
                    >
                      Acknowledge
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleFeedbackAction(item, "in_progress")
                      }
                      disabled={busy}
                      className="rounded border border-harvest-gold px-3 py-1.5 text-xs font-semibold text-harvest-gold"
                    >
                      In progress
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleFeedbackAction(item, "resolved")
                      }
                      disabled={busy}
                      className="rounded bg-agro-green px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "metrics" && (
        <div className="space-y-5">
          {!metrics ? (
            <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-deep-navy/50">
              Activate a pilot configuration to see metrics.
            </p>
          ) : (
            <>
              <p className="text-sm text-deep-navy/60">
                Window: {formatDate(metrics.window.start)} to{" "}
                {formatDate(metrics.window.end)} ({metrics.window.timezone})
              </p>
              {(
                [
                  ["Farmers", metrics.farmers],
                  ["Buyers", metrics.buyers],
                  ["Marketplace", metrics.marketplace],
                  ["Accessibility", metrics.accessibility],
                  ["Trust and safety", metrics.trust],
                  ["Participation", metrics.participation],
                ] as Array<[string, Record<string, number>]>
              ).map(([group, values]) => (
                <section key={group} className="space-y-2">
                  <h2 className="font-heading text-lg font-bold text-deep-navy">
                    {group}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(values).map(([key, value]) => (
                      <MetricCard
                        key={key}
                        label={key.replaceAll("_", " ")}
                        value={value}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}
        </div>
      )}

      {!loading && tab === "settings" && (
        <div className="space-y-5">
          <form
            onSubmit={handleCreateConfiguration}
            className="rounded-2xl border border-deep-navy/10 bg-white p-5"
          >
            <h2 className="font-heading text-lg font-bold text-deep-navy">
              Create pilot configuration
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-deep-navy">
                Name
                <input
                  required
                  value={configForm.name}
                  onChange={(event) =>
                    setConfigForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-deep-navy/20 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-deep-navy">
                State or region
                <input
                  value={configForm.state_or_region}
                  onChange={(event) =>
                    setConfigForm((previous) => ({
                      ...previous,
                      state_or_region: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-deep-navy/20 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-deep-navy">
                Start date
                <input
                  type="date"
                  value={configForm.start_date}
                  onChange={(event) =>
                    setConfigForm((previous) => ({
                      ...previous,
                      start_date: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-deep-navy/20 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-deep-navy">
                End date
                <input
                  type="date"
                  value={configForm.end_date}
                  onChange={(event) =>
                    setConfigForm((previous) => ({
                      ...previous,
                      end_date: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-deep-navy/20 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-deep-navy sm:col-span-2">
                Locations (comma separated)
                <input
                  value={configForm.locations}
                  onChange={(event) =>
                    setConfigForm((previous) => ({
                      ...previous,
                      locations: event.target.value,
                    }))
                  }
                  placeholder="Jos North, Bokkos, Riyom"
                  className="mt-1 w-full rounded-lg border border-deep-navy/20 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm font-medium text-deep-navy">
              <input
                type="checkbox"
                checked={configForm.is_active}
                onChange={(event) =>
                  setConfigForm((previous) => ({
                    ...previous,
                    is_active: event.target.checked,
                  }))
                }
              />
              Make this the active pilot
            </label>
            <button
              type="submit"
              disabled={busy}
              className="mt-4 rounded-lg bg-agro-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Create configuration
            </button>
          </form>

          <div className="rounded-2xl border border-deep-navy/10 bg-white p-5">
            <h2 className="font-heading text-lg font-bold text-deep-navy">
              Configurations
            </h2>
            <div className="mt-3 space-y-2">
              {configurations.map((configuration) => (
                <div
                  key={configuration.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-deep-navy/10 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-deep-navy">
                      {configuration.name}{" "}
                      {configuration.is_active && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          Active
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-deep-navy/60">
                      {configuration.status} ·{" "}
                      {configuration.state_or_region},{" "}
                      {configuration.country} ·{" "}
                      {formatDate(configuration.start_date)} to{" "}
                      {formatDate(configuration.end_date)}
                    </p>
                  </div>
                  {!configuration.is_active && (
                    <button
                      type="button"
                      onClick={() => void handleActivate(configuration)}
                      disabled={busy}
                      className="rounded-lg border border-agro-green px-3 py-1.5 text-xs font-semibold text-agro-green disabled:opacity-50"
                    >
                      Activate
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
