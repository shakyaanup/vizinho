import type { z } from "zod";

/**
 * What a form action returns to its form. Errors are translation keys
 * (`Code`), never raw internal messages, so the UI always shows localized
 * text. Each feature defines its own `Code` union from its message files.
 */
export type FormState<
  Field extends string,
  Code extends string,
  Success extends object = object,
> =
  | { status: "idle" }
  | {
      status: "error";
      formError?: Code;
      fieldErrors?: Partial<Record<Field, Code>>;
      /** Non-secret values to put back into the form (never passwords). */
      values?: Partial<Record<Field, string>>;
    }
  | ({ status: "success" } & Success);

export const idleState = { status: "idle" } as const;

/** Turns zod issues into one error code per field (the first issue wins). */
export function fieldErrorsFrom<Field extends string, Code extends string>(
  error: z.ZodError,
): Partial<Record<Field, Code>> {
  const result: Partial<Record<Field, Code>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as Field | undefined;
    if (field && !result[field]) result[field] = issue.message as Code;
  }
  return result;
}
