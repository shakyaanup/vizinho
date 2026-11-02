"use client";

import { clsx } from "clsx";
import { Label } from "radix-ui";
import { createContext, use, useId, type ReactNode } from "react";
import styles from "./Field.module.scss";

type FieldContextValue = {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
};

const FieldContext = createContext<FieldContextValue | null>(null);

/**
 * Read by form controls (Input, etc.) so they are automatically wired to the
 * Field's label, hint and error. Returns null when used outside a Field.
 */
export function useFieldControl() {
  return use(FieldContext);
}

type FieldProps = {
  label: string;
  /** Helper text shown under the label. */
  hint?: string;
  /** Validation message. Its presence marks the control as invalid. */
  error?: string;
  required?: boolean;
  /** Shown next to required labels, e.g. a translated "(required)". */
  requiredIndicator?: string;
  className?: string;
  children: ReactNode;
};

export function Field({
  label,
  hint,
  error,
  required = false,
  requiredIndicator,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext value={{ id, describedBy, invalid: Boolean(error), required }}>
      <div className={clsx(styles.field, className)}>
        <Label.Root htmlFor={id} className={styles.label}>
          {label}
          {required && requiredIndicator && (
            <span className={styles.required}> {requiredIndicator}</span>
          )}
        </Label.Root>
        {hint && (
          <p id={hintId} className={styles.hint}>
            {hint}
          </p>
        )}
        {children}
        {error && (
          // role="alert" announces the error as soon as it appears.
          <p id={errorId} className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    </FieldContext>
  );
}
