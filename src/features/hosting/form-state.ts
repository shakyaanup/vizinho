import type { FormState } from "@/lib/forms/form-state";
import type messages from "@/messages/en.json";

/** A key of Hosting.errors in the message files. */
export type HostingErrorCode = keyof (typeof messages)["Hosting"]["errors"];

export type HostingFormState<Field extends string = never> = FormState<
  Field,
  HostingErrorCode
>;
