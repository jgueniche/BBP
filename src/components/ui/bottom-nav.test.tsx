import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BottomNav } from "./bottom-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/journal",
}));

describe("BottomNav", () => {
  it("renders the five main tabs and marks the active one", () => {
    render(<BottomNav />);

    for (const label of ["Journal", "Recettes", "Kémia", "Planning", "Moi"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }

    expect(screen.getByRole("link", { name: "Journal" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
