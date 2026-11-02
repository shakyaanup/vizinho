import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../Button";
import { ToastProvider, useToast } from "./Toast";

function Trigger() {
  const { toast } = useToast();
  return (
    <Button onClick={() => toast({ title: "Reservation sent", variant: "success" })}>
      Notify
    </Button>
  );
}

describe("Toast", () => {
  it("shows a toast that can be dismissed", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider closeLabel="Dismiss" viewportLabel="Notifications">
        <Trigger />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Notify" }));
    expect(screen.getAllByText("Reservation sent").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
  });

  it("throws a helpful error outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(
      "useToast must be used inside <ToastProvider>",
    );
  });
});
