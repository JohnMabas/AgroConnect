export const instant = false;

import CheckoutClient from "./checkout-client";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <CheckoutClient orderId={orderId} />;
}
