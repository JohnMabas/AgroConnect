export const instant = false;

import ListingDetailsPage from "./listing-details";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingDetailsPage listingId={id} />;
}
