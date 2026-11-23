export const instant = false;

import OfferDetailClient from "./offer-detail-client";

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  return <OfferDetailClient offerId={offerId} />;
}
