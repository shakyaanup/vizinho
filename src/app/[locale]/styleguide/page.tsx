import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import { StyleguideDemo } from "./styleguide-demo";
import styles from "./styleguide.module.scss";

// Internal design-system showcase. English only by design: it documents
// components for developers and reviewers, not end users.
export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

const swatches = [
  "bg",
  "surface",
  "surface-sunken",
  "border",
  "text",
  "text-muted",
  "primary",
  "accent",
  "success",
  "warning",
  "danger",
] as const;

export default function StyleguidePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Vizinho design system</h1>
        <p>
          Tokens, themes and the base component kit. Toggle the theme to check contrast.
        </p>
      </header>

      <section aria-labelledby="logo-heading" className={styles.section}>
        <h2 id="logo-heading">Logo</h2>
        <div className={styles.grid}>
          <Logo size="lg" />
          <Logo />
          <Logo withWordmark={false} />
        </div>
      </section>

      <section aria-labelledby="colors-heading" className={styles.section}>
        <h2 id="colors-heading">Color roles</h2>
        <ul className={styles.swatches}>
          {swatches.map((name) => (
            <li key={name} className={styles.swatch}>
              <span
                className={styles.chip}
                style={{ background: `var(--color-${name})` }}
                aria-hidden
              />
              <code>--color-{name}</code>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cards-heading" className={styles.section}>
        <h2 id="cards-heading">Cards</h2>
        <div className={styles.grid}>
          <Card as="article">
            <h3 className={styles.cardTitle}>Default card</h3>
            <p className={styles.muted}>Bordered surface for lists and forms.</p>
          </Card>
          <Card as="article" elevated>
            <h3 className={styles.cardTitle}>Elevated card</h3>
            <p className={styles.muted}>Shadowed surface for overlays and highlights.</p>
          </Card>
        </div>
      </section>

      <StyleguideDemo />
    </main>
  );
}
