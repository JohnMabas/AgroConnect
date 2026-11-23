export const instant = false;

import { Suspense } from "react";
import PaymentCallbackClient from "./payment-callback-client";

function CallbackSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-soft-bg px-4">
      <div className="h-48 w-full max-w-lg animate-pulse rounded-2xl bg-white shadow-sm" />
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<CallbackSkeleton />}>
      <PaymentCallbackClient />
    </Suspense>
  );
}
