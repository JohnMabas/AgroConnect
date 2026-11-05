import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ListingData } from "@/lib/api";
import { ListingCard } from "@/components/listings/listing-card";

function makeListing(overrides: Partial<ListingData> = {}): ListingData {
  return {
    id: "listing-1",
    farmer_user_id: "farmer-1",
    produce_type_id: "type-1",
    title: "Fresh tomatoes",
    description: "Vine ripened",
    variety: "Roma",
    grade: "A",
    quantity: 100,
    available_quantity: 100,
    reserved_quantity: 0,
    sold_quantity: 0,
    unit: "kg",
    packaging_description: "Baskets",
    price_per_unit: 1200,
    currency: "NGN",
    country: "Nigeria",
    state_or_region: "Kaduna",
    status: "draft",
    is_available: true,
    harvest_date: null,
    available_from: null,
    expiry_date: null,
    local_government_area: null,
    community: null,
    collection_location: null,
    produce_type: {
      id: "type-1",
      category_id: "category-1",
      name: "Tomatoes",
      slug: "tomatoes",
      description: null,
      image_url: null,
      is_active: true,
    },
    images: [
      {
        id: "image-1",
        listing_id: "listing-1",
        image_url: "/uploads/tomato.jpg",
        is_primary: true,
        display_order: 0,
      },
    ],
    created_at: "2026-11-01T00:00:00.000Z",
    updated_at: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("ListingCard", () => {
  it("renders the listing summary and primary image", () => {
    render(
      <ListingCard listing={makeListing()} busy={false} onAction={() => {}} />,
    );

    expect(screen.getByText("Fresh tomatoes")).toBeTruthy();
    expect(screen.getByText("Tomatoes")).toBeTruthy();
    expect(screen.getByText(/100 kg/)).toBeTruthy();
    expect(screen.getByRole("img")).toBeTruthy();
  });

  it("publishes a draft listing", () => {
    const onAction = vi.fn();
    render(
      <ListingCard
        listing={makeListing({ status: "draft" })}
        busy={false}
        onAction={onAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    expect(onAction).toHaveBeenCalledWith("publish", "listing-1");
  });

  it("shows resume and close actions for paused listings", () => {
    const onAction = vi.fn();
    render(
      <ListingCard
        listing={makeListing({ status: "paused" })}
        busy={false}
        onAction={onAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onAction).toHaveBeenNthCalledWith(1, "resume", "listing-1");
    expect(onAction).toHaveBeenNthCalledWith(2, "close", "listing-1");
  });

  it("disables actions while busy", () => {
    render(
      <ListingCard
        listing={makeListing({ status: "draft" })}
        busy
        onAction={() => {}}
      />,
    );

    const buttons = screen.getAllByRole("button", { name: "…" });
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((button) => expect(button).toBeDisabled());
  });
});
