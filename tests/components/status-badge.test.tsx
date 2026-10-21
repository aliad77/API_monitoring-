import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge, displayStatus } from "@/components/monitors/status-badge";

describe("StatusBadge", () => {
  it("shows a text label so status is not conveyed by colour alone", () => {
    render(<StatusBadge status="DOWN" />);
    expect(screen.getByText("Down")).toBeInTheDocument();
  });

  it("shows paused monitors as paused regardless of their last status", () => {
    expect(displayStatus({ status: "DOWN", isActive: false })).toBe("PAUSED");
    expect(displayStatus({ status: "UP", isActive: true })).toBe("UP");
  });
});
