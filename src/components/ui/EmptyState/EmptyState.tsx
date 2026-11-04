import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./EmptyState.module.scss";

type EmptyStateProps = {
  icon: LucideIcon;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  headingLevel?: 2 | 3;
};

/** Placeholder for an empty list or unfinished section, with a next step. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  headingLevel = 2,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className={styles.empty}>
      <span className={styles.icon} aria-hidden>
        <Icon />
      </span>
      <Heading className={styles.title}>{title}</Heading>
      {children && <div className={styles.body}>{children}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
