import { homePathForRoles, isAppRole } from "./roles";

describe("isAppRole", () => {
  it("accepts known roles only", () => {
    expect(isAppRole("host")).toBe(true);
    expect(["superuser", 7, null, undefined].some(isAppRole)).toBe(false);
  });
});

describe("homePathForRoles", () => {
  it("sends each user to their most privileged area", () => {
    expect(homePathForRoles(["customer"])).toBe("/customer");
    expect(homePathForRoles(["customer", "host"])).toBe("/host");
    expect(homePathForRoles(["customer", "host", "admin"])).toBe("/admin");
  });
});
