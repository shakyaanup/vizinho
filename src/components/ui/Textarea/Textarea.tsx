"use client";

import { clsx } from "clsx";
import type { ComponentProps } from "react";
import { useFieldControl } from "../Field";
import styles from "./Textarea.module.scss";

export type TextareaProps = ComponentProps<"textarea">;

/**
 * Multi-line text input. Inside a <Field>, it picks up the id (so the label
 * is linked), aria-describedby, aria-invalid and required, like Input.
 */
export function Textarea({ className, rows = 3, ...props }: TextareaProps) {
  const field = useFieldControl();

  return (
    <textarea
      id={field?.id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      required={field?.required || undefined}
      rows={rows}
      className={clsx(styles.textarea, className)}
      {...props}
    />
  );
}
