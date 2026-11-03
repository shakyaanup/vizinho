import styles from "./auth-layout.module.scss";

export function AuthHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <h1>{title}</h1>
      {subtitle ? (
        <p className={styles.subtitle}>{subtitle}</p>
      ) : (
        <div className={styles.subtitle} />
      )}
    </>
  );
}
