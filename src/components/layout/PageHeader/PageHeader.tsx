import type { ReactNode } from "react";
import styles from "./PageHeader.module.scss";

type PageHeaderProps = { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode };

/** Page title (the page's only <h1>), optional subtitle and actions. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
