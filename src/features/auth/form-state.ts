import type { z } from "zod";
import {
  fieldErrorsFrom as baseFieldErrorsFrom,
  type FormState as BaseFormState,
} from "@/lib/forms/form-state";
import type messages from "@/messages/en.json";

export { idleState } from "@/lib/forms/form-state";

/** A key of Auth.errors in the message files. */
export type AuthErrorCode = keyof (typeof messages)["Auth"]["errors"];

export type FormState<Field extends string> = BaseFormState<
  Field,
  AuthErrorCode,
  { redirectTo: string }
>;

export function fieldErrorsFrom<Field extends string>(error: z.ZodError) {
  return baseFieldErrorsFrom<Field, AuthErrorCode>(error);
}
