import styles from "./page.module.scss";

// Placeholder landing page. Replaced in Step 5 (demo logins + i18n).
export default function HomePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Vizinho</h1>
      <p>Your parcels, held by a neighbor you trust.</p>
    </main>
  );
}
