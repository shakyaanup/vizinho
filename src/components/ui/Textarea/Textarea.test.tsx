import { render, screen } from "@testing-library/react";
import { Field } from "../Field";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("is labelled and described by its Field", () => {
    render(
      <Field label="House rules" hint="Floor, buzzer" error="Too long">
        <Textarea name="rules" />
      </Field>,
    );
    const textarea = screen.getByRole("textbox", { name: "House rules" });
    expect(textarea).toHaveAccessibleDescription("Floor, buzzer Too long");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
  });
});
