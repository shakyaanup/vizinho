"use client";

import { clsx } from "clsx";
import type { ComponentProps } from "react";
import { useFieldControl } from "../Field";
import styles from "./Input.module.scss";

export type InputProps = ComponentProps<"input">;

/**
 * Text-like input. Inside a <Field>, it picks up the id, aria-describedby,
 * aria-invalid and required state automatically; explicit props still win.
 */
export function Input({ className, ...props }: InputProps) {
  const field = useFieldControl();

  return (
    <input
      id={field?.id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      required={field?.required || undefined}
      className={clsx(styles.input, className)}
      {...props}
    />
  );
}
