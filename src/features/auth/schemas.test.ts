import { loginSchema, signupSchema } from "./schemas";

const valid = {
  fullName: "Rita Sousa",
  email: "Rita@Example.com ",
  password: "Lisboa2026",
  acceptTerms: "on",
};

describe("signupSchema", () => {
  it("accepts a valid sign-up and normalises the email", () => {
    const result = signupSchema.parse(valid);
    expect(result.email).toBe("rita@example.com");
  });

  it.each([
    ["password", "short1", "passwordTooShort"],
    ["password", "onlyletters", "passwordWeak"],
    ["password", "12345678", "passwordWeak"],
    ["password", "a1".repeat(40), "passwordTooLong"],
    ["fullName", " ", "nameRequired"],
    ["email", "not-an-email", "emailInvalid"],
    ["acceptTerms", undefined, "termsRequired"],
  ])("rejects %s=%p with %s", (field, value, code) => {
    const result = signupSchema.safeParse({ ...valid, [field]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path[0]).toBe(field);
    expect(result.error?.issues[0]?.message).toBe(code);
  });
});

describe("loginSchema", () => {
  it("requires a password but does not apply strength rules", () => {
    expect(loginSchema.safeParse({ email: "a@b.pt", password: "x" }).success).toBe(true);
    expect(
      loginSchema.safeParse({ email: "a@b.pt", password: "" }).error?.issues[0]?.message,
    ).toBe("passwordRequired");
  });
});
