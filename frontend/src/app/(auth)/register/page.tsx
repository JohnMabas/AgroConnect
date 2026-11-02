"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, type ApiError } from "@/lib/api";

interface FormState {
  display_name: string;
  phone_number: string;
  email: string;
  password: string;
  password_confirm: string;
}

const INITIAL: FormState = {
  display_name: "",
  phone_number: "",
  email: "",
  password: "",
  password_confirm: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setGlobalError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setGlobalError("");

    // Client-side validation
    const errs: Record<string, string> = {};
    if (!form.phone_number && !form.email) {
      errs.phone_number = "Provide a phone number, email, or both.";
      errs.email = "Provide a phone number, email, or both.";
    }
    if (!form.password) errs.password = "Password is required.";
    if (form.password !== form.password_confirm)
      errs.password_confirm = "Passwords do not match.";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const result = await authApi.register({
        display_name: form.display_name || undefined,
        phone_number: form.phone_number || undefined,
        email: form.email || undefined,
        password: form.password,
        password_confirm: form.password_confirm,
      });

      const userId = result.data.user.id;

      // Redirect to the appropriate verification page.
      if (result.data.phone_otp_pending) {
        router.push(`/verify-phone?user_id=${userId}`);
      } else if (result.data.email_verification_pending) {
        router.push(`/verify-email?user_id=${userId}`);
      } else {
        router.push("/login?registered=1");
      }
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const e of apiErr.errors) {
          fieldErrors[e.field] = e.message;
        }
        setErrors(fieldErrors);
      } else {
        setGlobalError(apiErr.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-deep-navy/10 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-deep-navy/60">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-agro-green hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {globalError && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {globalError}
          </div>
        )}

        {/* Display name */}
        <div>
          <label
            htmlFor="display_name"
            className="mb-1.5 block text-sm font-semibold text-deep-navy"
          >
            Display name <span className="font-normal text-deep-navy/50">(optional)</span>
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            autoComplete="name"
            value={form.display_name}
            onChange={handleChange}
            placeholder="e.g. Aminu Musa"
            className={inputClass(errors.display_name)}
          />
          {errors.display_name && (
            <FieldError message={errors.display_name} />
          )}
        </div>

        {/* Contact methods — at least one required */}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-deep-navy">
            Contact{" "}
            <span className="font-normal text-deep-navy/60">
              — provide a phone number, email, or both
            </span>
          </legend>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="phone_number"
                className="mb-1.5 block text-sm font-medium text-deep-navy"
              >
                Phone number
              </label>
              <input
                id="phone_number"
                name="phone_number"
                type="tel"
                autoComplete="tel"
                value={form.phone_number}
                onChange={handleChange}
                placeholder="+2348031234567"
                className={inputClass(errors.phone_number)}
              />
              {errors.phone_number && (
                <FieldError message={errors.phone_number} />
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-deep-navy"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className={inputClass(errors.email)}
              />
              {errors.email && <FieldError message={errors.email} />}
            </div>
          </div>
        </fieldset>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-semibold text-deep-navy"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            placeholder="Minimum 8 characters"
            className={inputClass(errors.password)}
          />
          {errors.password && <FieldError message={errors.password} />}
        </div>

        <div>
          <label
            htmlFor="password_confirm"
            className="mb-1.5 block text-sm font-semibold text-deep-navy"
          >
            Confirm password
          </label>
          <input
            id="password_confirm"
            name="password_confirm"
            type="password"
            autoComplete="new-password"
            value={form.password_confirm}
            onChange={handleChange}
            placeholder="Repeat your password"
            className={inputClass(errors.password_confirm)}
          />
          {errors.password_confirm && (
            <FieldError message={errors.password_confirm} />
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-agro-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-deep-navy disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </div>
  );
}

function inputClass(error?: string) {
  const base =
    "w-full rounded-xl border px-4 py-3 text-sm text-deep-navy placeholder:text-deep-navy/40 outline-none transition-colors focus:ring-2 focus:ring-agro-green/30";
  return error
    ? `${base} border-red-400 bg-red-50 focus:border-red-400`
    : `${base} border-deep-navy/20 bg-white focus:border-agro-green`;
}

function FieldError({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-1 text-xs text-red-600">
      {message}
    </p>
  );
}
