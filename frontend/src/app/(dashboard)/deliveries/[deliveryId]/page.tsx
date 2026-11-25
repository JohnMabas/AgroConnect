export const instant = false;

import { DeliveryDetail } from "@/components/deliveries/delivery-detail";

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ deliveryId: string }>;
}) {
  const { deliveryId } = await params;
  return <DeliveryDetail deliveryId={deliveryId} />;
}
