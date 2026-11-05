import { render, screen } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("shows the wordmark and hides the decorative mark from screen readers", () => {
    const { container } = render(<Logo />);
    expect(screen.getByText("Vizinho")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("labels the mark when it stands alone", () => {
    render(<Logo withWordmark={false} />);
    expect(screen.getByRole("img", { name: "Vizinho" })).toBeInTheDocument();
    expect(screen.queryByText("Vizinho")).not.toBeInTheDocument();
  });
});
