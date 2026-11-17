export const instant = false;

import MarketplaceListingClient from "./marketplace-listing-client";

export default async function MarketplaceListingDetailPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;
  return <MarketplaceListingClient listingId={listingId} />;
}
