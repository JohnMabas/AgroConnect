import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuantityDisplay } from "@/components/listings/quantity-display";

describe("QuantityDisplay", () => {
  it("shows the available quantity and unit", () => {
    render(<QuantityDisplay available={42} unit="kg" />);

    expect(screen.getByText("42 kg")).toBeTruthy();
    expect(screen.getByText(/available/)).toBeTruthy();
  });

  it("shows reserved and sold breakdown when supplied", () => {
    render(
      <QuantityDisplay available={10} unit="bags" reserved={3} sold={7} />,
    );

    expect(screen.getByText(/3 reserved/)).toBeTruthy();
    expect(screen.getByText(/7 sold/)).toBeTruthy();
  });
});
