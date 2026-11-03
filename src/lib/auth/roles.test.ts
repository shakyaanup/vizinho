import { homePathForRoles, parseRoles } from "./roles";

describe("parseRoles", () => {
  it("keeps known roles from the JWT claim", () => {
    expect(parseRoles(["customer", "host"])).toEqual(["customer", "host"]);
  });

  it("drops unknown or malformed values", () => {
    expect(parseRoles(["customer", "superuser", 7, null])).toEqual(["customer"]);
  });

  it.each([undefined, null, "admin", { role: "admin" }])("returns [] for %p", (claim) => {
    expect(parseRoles(claim)).toEqual([]);
  });
});

describe("homePathForRoles", () => {
  it("sends each user to their most privileged area", () => {
    expect(homePathForRoles(["customer"])).toBe("/customer");
    expect(homePathForRoles(["customer", "host"])).toBe("/host");
    expect(homePathForRoles(["customer", "host", "admin"])).toBe("/admin");
  });
});
