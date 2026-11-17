export const instant = false;

import BuyerRequestDetailClient from "./buyer-request-detail-client";

export default async function BuyerRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  return <BuyerRequestDetailClient requestId={requestId} />;
}
