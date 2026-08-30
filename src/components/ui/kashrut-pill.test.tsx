import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KashrutPill } from "./kashrut-pill";

describe("KashrutPill", () => {
  it("renders each kashrut class with its French label", () => {
    render(
      <>
        <KashrutPill kind="bassari" />
        <KashrutPill kind="halavi" />
        <KashrutPill kind="parve" />
      </>,
    );
    expect(screen.getByText("Bassari")).toBeInTheDocument();
    expect(screen.getByText("Halavi")).toBeInTheDocument();
    expect(screen.getByText("Parvé")).toBeInTheDocument();
  });

  it("marks fish as parve with the fish mention", () => {
    render(<KashrutPill kind="parve" isFish />);
    expect(screen.getByText("Parvé · poisson")).toBeInTheDocument();
  });
});
