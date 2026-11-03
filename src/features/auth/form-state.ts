import type { z } from "zod";
import type messages from "@/messages/en.json";

/** A key of Auth.errors in the message files. */
export type AuthErrorCode = keyof (typeof messages)["Auth"]["errors"];

/**
 * What a server action returns to its form. Errors are translation keys,
 * never raw Supabase/DB messages, so nothing internal leaks to the browser.
 */
export type FormState<Field extends string> =
  | { status: "idle" }
  | {
      status: "error";
      formError?: AuthErrorCode;
      fieldErrors?: Partial<Record<Field, AuthErrorCode>>;
      /** Non-secret values to put back into the form (never passwords). */
      values?: Partial<Record<Field, string>>;
    }
  | { status: "success"; email?: string };

export const idleState = { status: "idle" } as const;

/** Turns zod issues into one error code per field (the first issue wins). */
export function fieldErrorsFrom<Field extends string>(
  error: z.ZodError,
): Partial<Record<Field, AuthErrorCode>> {
  const result: Partial<Record<Field, AuthErrorCode>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as Field | undefined;
    if (field && !result[field]) result[field] = issue.message as AuthErrorCode;
  }
  return result;
}
