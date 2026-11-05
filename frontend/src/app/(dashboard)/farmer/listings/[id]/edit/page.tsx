export const instant = false;

import EditListingClient from "./edit-listing-client";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditListingClient listingId={id} />;
}
