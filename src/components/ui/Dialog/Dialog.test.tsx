import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog, DialogContent, DialogTrigger } from "./Dialog";

function Example() {
  return (
    <Dialog>
      <DialogTrigger>Open details</DialogTrigger>
      <DialogContent title="Host details" description="Opening hours" closeLabel="Close">
        <p>Body</p>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("opens with an accessible name and description, then closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: "Open details" }));
    const dialog = screen.getByRole("dialog", { name: "Host details" });
    expect(dialog).toHaveAccessibleDescription("Opening hours");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes from the labelled close button and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open details" });

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
