import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("is disabled and marked busy while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders its child element with button styles when asChild is set", () => {
    render(
      <Button asChild variant="secondary">
        <a href="/login">Log in</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Log in" });

    expect(link).toHaveAttribute("href", "/login");
    expect(link).toHaveClass("button", "secondary");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
