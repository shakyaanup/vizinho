import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it.each(["/account", "/host/reservations?tab=pending", "/pt/account#top"])(
    "allows same-site path %s",
    (path) => {
      expect(safeRedirectPath(path, "/fallback")).toBe(path);
    },
  );

  it.each([
    ["absolute URL", "https://evil.example"],
    ["protocol-relative URL", "//evil.example/phish"],
    ["backslash trick", "/\\evil.example"],
    ["javascript: URL", "javascript:alert(1)"],
    ["relative path", "account"],
    ["newline injection", "/acc\nount"],
    ["tab injection", "/\t/evil.example"],
    ["empty string", ""],
    ["non-string", 42],
    ["null", null],
    ["overlong", "/" + "a".repeat(600)],
  ])("rejects %s", (_name, input) => {
    expect(safeRedirectPath(input, "/fallback")).toBe("/fallback");
  });
});
