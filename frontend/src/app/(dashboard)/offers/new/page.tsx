export const instant = false;

import OfferCreateClient from "./offer-create-client";

export default async function NewOfferPage({
  searchParams,
}: {
  searchParams: Promise<{
    listingId?: string;
    buyerRequestId?: string;
    conversationId?: string;
  }>;
}) {
  const { listingId, buyerRequestId, conversationId } = await searchParams;

  return (
    <OfferCreateClient
      listingId={typeof listingId === "string" ? listingId : ""}
      buyerRequestId={typeof buyerRequestId === "string" ? buyerRequestId : ""}
      conversationId={typeof conversationId === "string" ? conversationId : ""}
    />
  );
}
