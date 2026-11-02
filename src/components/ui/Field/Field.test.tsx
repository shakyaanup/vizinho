import { render, screen } from "@testing-library/react";
import { Input } from "../Input";
import { Field } from "./Field";

describe("Field + Input", () => {
  it("links the label to the input", () => {
    render(
      <Field label="Email">
        <Input type="email" />
      </Field>,
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
  });

  it("describes the input with its hint and error, and marks it invalid", () => {
    render(
      <Field label="Email" hint="We never share it." error="Enter a valid email.">
        <Input type="email" />
      </Field>,
    );
    const input = screen.getByLabelText("Email");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("We never share it. Enter a valid email.");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email.");
  });

  it("is valid and has no description by default", () => {
    render(
      <Field label="Name" required>
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Name");

    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).toBeRequired();
  });

  it("works standalone, outside a Field", () => {
    render(<Input aria-label="Search" />);
    expect(screen.getByRole("textbox", { name: "Search" })).toBeInTheDocument();
  });
});
