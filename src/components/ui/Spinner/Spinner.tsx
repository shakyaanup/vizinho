import { clsx } from "clsx";
import styles from "./Spinner.module.scss";

type SpinnerProps = {
  size?: "sm" | "md" | "lg";
  /** Announced to screen readers. Omit when the parent already conveys loading (e.g. aria-busy). */
  label?: string;
  className?: string;
};

export function Spinner({ size = "md", label, className }: SpinnerProps) {
  return (
    <span
      className={clsx(styles.spinner, styles[size], className)}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
