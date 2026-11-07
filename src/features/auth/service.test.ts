import { DomainError } from "@/mocks/errors";
import { createSeed, DEMO_PASSWORD } from "@/mocks/seed";
import { hashPassword } from "./password";
import { findUserByCredentials, registerUser } from "./service";

describe("auth service", () => {
  it("signs in with the right password only", async () => {
    const db = createSeed();
    const email = "customer@demo.vizinho.app";
    expect(
      findUserByCredentials(db, email, await hashPassword(email, DEMO_PASSWORD))
        ?.fullName,
    ).toBe("Carla Costa");
    expect(
      findUserByCredentials(db, email, await hashPassword(email, "wrong")),
    ).toBeNull();
  });

  it("mock accounts without a password can never sign in", () => {
    const db = createSeed();
    expect(findUserByCredentials(db, "host01@mock.vizinho.app", "")).toBeNull();
  });

  it("registers customers only, records the terms, and refuses duplicates", async () => {
    const db = createSeed();
    const input = {
      fullName: "Rita Sousa",
      email: "rita@example.com",
      passwordHash: await hashPassword("rita@example.com", "Lisboa2026"),
      locale: "pt-PT" as const,
    };
    const user = registerUser(db, input);
    expect(user.roles).toEqual(["customer"]);
    expect(db.legalAcceptances.filter((a) => a.userId === user.id)).toHaveLength(2);
    expect(() => registerUser(db, input)).toThrow(DomainError);
  });
});
