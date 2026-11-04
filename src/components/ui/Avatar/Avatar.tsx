import { clsx } from "clsx";
import styles from "./Avatar.module.scss";

/** "Carla Costa" → "CC", "ana" → "A". */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

type AvatarProps = { name: string; size?: "sm" | "md"; className?: string };

/** Initials avatar. Decorative: the name is always shown or labelled nearby. */
export function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <span className={clsx(styles.avatar, styles[size], className)} aria-hidden>
      {initials(name)}
    </span>
  );
}
