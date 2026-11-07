import { DomainError } from "@/mocks/errors";
import { TERMS_VERSION } from "@/mocks/seed";
import type { DemoDb, Locale, User } from "@/mocks/types";

/** The user with these credentials, or null. Callers show one generic error. */
export function findUserByCredentials(db: DemoDb, email: string, passwordHash: string) {
  return (
    db.users.find(
      (user) =>
        user.email === email &&
        user.passwordHash !== null &&
        user.passwordHash === passwordHash,
    ) ?? null
  );
}

type NewUser = { fullName: string; email: string; passwordHash: string; locale: Locale };

/** Creates a customer account (what the sign-up trigger did in the database). */
export function registerUser(db: DemoDb, input: NewUser): User {
  if (db.users.some((user) => user.email === input.email)) {
    throw new DomainError("emailTaken");
  }

  const now = new Date().toISOString();
  const user: User = {
    id: crypto.randomUUID(),
    email: input.email,
    fullName: input.fullName,
    locale: input.locale,
    // Roles are never chosen by the user: everyone starts as a customer.
    roles: ["customer"],
    passwordHash: input.passwordHash,
    termsVersion: TERMS_VERSION,
    createdAt: now,
  };

  db.users.push(user);
  for (const document of ["terms", "privacy"] as const) {
    db.legalAcceptances.push({
      userId: user.id,
      document,
      version: TERMS_VERSION,
      acceptedAt: now,
    });
  }
  return user;
}
