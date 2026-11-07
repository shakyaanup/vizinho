"use client";

import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { useFieldControl } from "../Field";
import styles from "./Select.module.scss";

export type SelectProps = ComponentProps<"select">;

/**
 * Native select styled like Input. Native on purpose: phones open their own
 * accessible picker. Inside a <Field> it is wired to the label, hint and error.
 */
export function Select({ className, children, ...props }: SelectProps) {
  const field = useFieldControl();

  return (
    <span className={styles.wrapper}>
      <select
        id={field?.id}
        aria-describedby={field?.describedBy}
        aria-invalid={field?.invalid || undefined}
        required={field?.required || undefined}
        className={clsx(styles.select, className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className={styles.chevron} />
    </span>
  );
}
