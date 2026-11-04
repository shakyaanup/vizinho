import { clsx } from "clsx";
import type { ReactNode } from "react";
import styles from "./Badge.module.scss";

type BadgeProps = {
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
  children: ReactNode;
  className?: string;
};

/** Small status label. Always has text, so meaning never depends on color. */
export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return <span className={clsx(styles.badge, styles[tone], className)}>{children}</span>;
}
