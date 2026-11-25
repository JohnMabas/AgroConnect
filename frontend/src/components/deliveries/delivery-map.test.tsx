import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeliveryMap } from "@/components/deliveries/delivery-map";

describe("DeliveryMap", () => {
  let originalToken: string | undefined;

  beforeEach(() => {
    originalToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    else process.env.NEXT_PUBLIC_MAPBOX_TOKEN = originalToken;
  });

  it("shows a configuration placeholder without a public Mapbox token", () => {
    render(
      <DeliveryMap
        pickupLatitude={9.8965}
        pickupLongitude={8.8583}
        deliveryLatitude={9.9172}
        deliveryLongitude={8.8931}
        currentLatitude={null}
        currentLongitude={null}
      />,
    );

    expect(screen.getByText("Map is awaiting configuration")).toBeTruthy();
    expect(screen.getByText(/NEXT_PUBLIC_MAPBOX_TOKEN/)).toBeTruthy();
  });
});
