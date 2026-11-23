"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDashboardAuth } from "@/hooks/useDashboardAuth";
import { ApiError, paymentsApi } from "@/lib/api";

type VerificationState = "verifying" | "success" | "failed";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

function StatusPanel({
  state,
  message,
  orderId,
}: {
  state: VerificationState;
  message: string;
  orderId: string | null;
}) {
  const href = orderId
    ? `/orders/${orderId}?payment=${state === "success" ? "success" : "failed"}`
    : "/orders";
  const title =
    state === "verifying"
      ? "Verifying payment"
      : state === "success"
        ? "Payment verified"
        : "Payment not completed";
  const role = state === "failed" ? "alert" : "status";

  return (
    <main className="flex min-h-screen items-center justify-center bg-soft-bg px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-deep-navy/8 bg-white p-8 text-center shadow-sm">
        <h1 className="font-heading text-2xl font-extrabold text-deep-navy">{title}</h1>
        <p role={role} className="mt-3 text-sm text-deep-navy/65">
          {message}
        </p>
        {state !== "verifying" && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={href}
              className="rounded-full bg-agro-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-deep-navy"
            >
              {orderId ? "View order" : "View orders"}
            </Link>
            <Link
              href="/orders"
              className="rounded-full border border-deep-navy/20 px-6 py-2.5 text-sm font-semibold text-deep-navy/70 transition-colors hover:bg-deep-navy/5"
            >
              All orders
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function PaymentCallbackClient() {
  const searchParams = useSearchParams();
  const { token, loading: authLoading, error: authError } = useDashboardAuth();
  const [state, setState] = useState<VerificationState>("verifying");
  const [message, setMessage] = useState("Checking this payment with the payment provider…");
  const [orderId, setOrderId] = useState<string | null>(null);
  const verifiedRef = useRef<string | null>(null);

  const reference = searchParams.get("reference") || searchParams.get("trxref");

  const verifyPayment = useCallback(async (accessToken: string, paymentReference: string) => {
    try {
      const response = await paymentsApi.verify(accessToken, paymentReference);
      const payment = response.data.payment;
      const verifiedOrder = response.data.order;
      const success =
        payment.status === "success" && verifiedOrder.payment_status === "paid";
      setOrderId(verifiedOrder.id);
      setMessage(
        payment.gateway_response ??
          (success
            ? "Payment was confirmed by the payment provider."
            : "The payment provider did not confirm this transaction."),
      );
      setState(success ? "success" : "failed");
    } catch (err) {
      setMessage(errorMessage(err, "We could not verify this payment."));
      setState("failed");
    }
  }, []);

  useEffect(() => {
    if (authLoading || !token || !reference) return;
    if (verifiedRef.current === reference) return;
    verifiedRef.current = reference;
    void verifyPayment(token, reference);
  }, [authLoading, token, reference, verifyPayment]);

  if (authLoading) {
    return (
      <StatusPanel
        state="verifying"
        message="Loading your session before verifying this payment…"
        orderId={null}
      />
    );
  }

  if (authError) {
    return <StatusPanel state="failed" message={authError} orderId={null} />;
  }

  if (!reference) {
    return (
      <StatusPanel
        state="failed"
        message="This payment callback is missing a transaction reference."
        orderId={null}
      />
    );
  }

  if (!token) {
    return (
      <StatusPanel
        state="verifying"
        message="Waiting for your session so the payment can be verified…"
        orderId={null}
      />
    );
  }

  return <StatusPanel state={state} message={message} orderId={orderId} />;
}
