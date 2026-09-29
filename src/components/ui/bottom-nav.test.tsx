import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BottomNav } from "./bottom-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/planning",
}));

describe("BottomNav", () => {
  it("renders the five main tabs and marks the active one", () => {
    render(<BottomNav />);

    for (const label of [
      "Recettes",
      "Planning",
      "Communauté",
      "Copine",
      "Moi",
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }

    expect(screen.getByRole("link", { name: "Planning" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Recettes" })).toHaveAttribute(
      "href",
      "/recettes",
    );
  });

  it("announces unread notifications on the community tab", () => {
    render(<BottomNav unread={3} />);
    expect(
      screen.getByRole("link", {
        name: "Communauté, 3 notifications non lues",
      }),
    ).toHaveAttribute("href", "/communaute");
  });
});
