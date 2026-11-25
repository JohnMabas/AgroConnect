"use client";

import { useEffect, useState } from "react";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import {
  notificationsApi,
  type ApiError,
  type NotificationPreferenceData,
  type UpdateNotificationPreferencesPayload,
} from "@/lib/api";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, Button, Checkbox } from "@/components/ui";

const CHANNEL_FIELDS: Array<{
  key: keyof UpdateNotificationPreferencesPayload;
  label: string;
  description: string;
}> = [
  {
    key: "in_app_enabled",
    label: "In-app notifications",
    description: "Show alerts inside your AgroConnect dashboard.",
  },
  {
    key: "email_enabled",
    label: "Email notifications",
    description: "Send eligible updates to your verified email address.",
  },
  {
    key: "sms_enabled",
    label: "SMS notifications",
    description: "Send eligible updates to your verified phone number.",
  },
];

const CATEGORY_FIELDS: Array<{
  key: keyof UpdateNotificationPreferencesPayload;
  label: string;
  description: string;
}> = [
  {
    key: "offers_enabled",
    label: "Offers",
    description: "New offers, counter offers and offer outcomes.",
  },
  {
    key: "messages_enabled",
    label: "Messages and missed calls",
    description: "New conversations and missed call alerts.",
  },
  {
    key: "orders_enabled",
    label: "Orders and reservations",
    description: "Order updates and reservation expiry warnings.",
  },
  {
    key: "payments_enabled",
    label: "Payments",
    description: "Payment success, failure and refund updates.",
  },
  {
    key: "deliveries_enabled",
    label: "Deliveries",
    description: "Assignment, pickup, transit and completion updates.",
  },
  {
    key: "reviews_enabled",
    label: "Reviews",
    description: "New reviews and review moderation outcomes.",
  },
  {
    key: "verifications_enabled",
    label: "Verification",
    description: "Verification submissions and decisions.",
  },
];

const ALL_FIELDS = [
  ...CHANNEL_FIELDS,
  ...CATEGORY_FIELDS,
  { key: "marketing_enabled" as const, label: "", description: "" },
].map((field) => field.key);

function buildPayload(
  form: NotificationPreferenceData,
  initial: NotificationPreferenceData,
): UpdateNotificationPreferencesPayload {
  const payload: UpdateNotificationPreferencesPayload = {};
  for (const key of ALL_FIELDS) {
    if (form[key] !== initial[key]) {
      payload[key] = form[key];
    }
  }
  return payload;
}

export default function NotificationPreferencesPage() {
  const { token, loading: authLoading, error: authError } = useDashboardAuth();

  const [preferences, setPreferences] =
    useState<NotificationPreferenceData | null>(null);
  const [initial, setInitial] = useState<NotificationPreferenceData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(async () => {
      try {
        const res = await notificationsApi.getPreferences(token);
        setPreferences(res.data.preferences);
        setInitial(res.data.preferences);
      } catch (err) {
        setError((err as ApiError).message || "Failed to load preferences.");
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [token]);

  function toggle(key: keyof UpdateNotificationPreferencesPayload) {
    setPreferences((current) =>
      current ? { ...current, [key]: !current[key] } : current,
    );
    setNotice("");
    setError("");
  }

  async function handleSave() {
    if (!token || !preferences || !initial) return;
    const payload = buildPayload(preferences, initial);
    if (Object.keys(payload).length === 0) {
      setNotice("Change at least one setting before saving.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await notificationsApi.updatePreferences(token, payload);
      setPreferences(res.data.preferences);
      setInitial(res.data.preferences);
      setNotice("Notification preferences saved.");
    } catch (err) {
      setError((err as ApiError).message || "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || (loading && !preferences)) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 rounded-xl bg-deep-navy/10" />
        <div className="h-24 rounded-2xl bg-white" />
        <div className="h-64 rounded-2xl bg-white" />
      </div>
    );
  }

  if (authError || !token || !preferences) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"
      >
        <p className="text-sm text-red-700">
          {authError || error || "Sign in to manage notification preferences."}
        </p>
      </div>
    );
  }

  const payload = initial ? buildPayload(preferences, initial) : {};
  const dirty = Object.keys(payload).length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification preferences"
        description="Choose which updates reach you and through which channels."
        breadcrumbs={[
          { label: "Notifications", href: "/notifications" },
          { label: "Preferences" },
        ]}
        action={
          <Button onClick={() => void handleSave()} loading={saving} disabled={!dirty}>
            Save changes
          </Button>
        }
      />

      <Alert variant="info">
        Security, account and critical transaction notices are controlled by the
        backend. Turning off a category may also suppress related critical
        updates, so keep important channels enabled.
      </Alert>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {notice}
        </div>
      )}

      <section className="rounded-2xl border border-deep-navy/8 bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-bold text-deep-navy">
          Delivery channels
        </h2>
        <p className="mt-1 text-sm text-deep-navy/55">
          Email and SMS require a verified address or phone number.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          {CHANNEL_FIELDS.map((field) => (
            <Checkbox
              key={field.key}
              id={`channel-${field.key}`}
              checked={preferences[field.key]}
              onChange={() => toggle(field.key)}
              label={
                <span>
                  <span className="block font-semibold">{field.label}</span>
                  <span className="block text-xs font-normal text-deep-navy/50">
                    {field.description}
                  </span>
                </span>
              }
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-deep-navy/8 bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-bold text-deep-navy">
          What you hear about
        </h2>
        <p className="mt-1 text-sm text-deep-navy/55">
          Category settings apply to optional updates in each area.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {CATEGORY_FIELDS.map((field) => (
            <Checkbox
              key={field.key}
              id={`category-${field.key}`}
              checked={preferences[field.key]}
              onChange={() => toggle(field.key)}
              label={
                <span>
                  <span className="block font-semibold">{field.label}</span>
                  <span className="block text-xs font-normal text-deep-navy/50">
                    {field.description}
                  </span>
                </span>
              }
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-harvest-gold/20 bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-bold text-deep-navy">
          Marketing
        </h2>
        <div className="mt-4">
          <Checkbox
            id="marketing-enabled"
            checked={preferences.marketing_enabled}
            onChange={() => toggle("marketing_enabled")}
            label={
              <span>
                <span className="block font-semibold">Promotional messages</span>
                <span className="block text-xs font-normal text-deep-navy/50">
                  Off by default. Service messages are never treated as marketing.
                </span>
              </span>
            }
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} loading={saving} disabled={!dirty}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
