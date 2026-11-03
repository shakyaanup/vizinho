import { clsx } from "clsx";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./Alert.module.scss";

type AlertProps = {
  variant?: "info" | "success" | "error";
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
};

const icons = { info: Info, success: CircleCheck, error: CircleAlert } as const;

/**
 * Inline message. Errors use role="alert" (announced immediately); info and
 * success use role="status" (announced politely).
 */
export function Alert({ variant = "info", title, children, className }: AlertProps) {
  const Icon = icons[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={clsx(styles.alert, styles[variant], className)}
    >
      <Icon className={styles.icon} aria-hidden />
      <div className={styles.content}>
        {title && <p className={styles.title}>{title}</p>}
        {children && <div className={styles.body}>{children}</div>}
      </div>
    </div>
  );
}
