import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "@/components/listings/status-badge";

describe("StatusBadge", () => {
  it("renders a human readable label for each status", () => {
    const { rerender } = render(<StatusBadge status="sold_out" />);
    expect(screen.getByText("sold out")).toBeTruthy();

    rerender(<StatusBadge status="published" />);
    expect(screen.getByText("published")).toBeTruthy();
  });
});
