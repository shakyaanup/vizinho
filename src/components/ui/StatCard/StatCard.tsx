import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "../Card";
import styles from "./StatCard.module.scss";

type StatCardProps = { label: ReactNode; value: ReactNode; icon: LucideIcon };

/** A single number with its label; the label is read first by screen readers. */
export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card className={styles.stat}>
      <Icon aria-hidden className={styles.icon} />
      <dl className={styles.text}>
        <dt className={styles.label}>{label}</dt>
        <dd className={styles.value}>{value}</dd>
      </dl>
    </Card>
  );
}
