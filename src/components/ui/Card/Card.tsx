import { clsx } from "clsx";
import type { ComponentProps, ElementType } from "react";
import styles from "./Card.module.scss";

type CardPadding = "none" | "sm" | "md" | "lg";

const paddingClass: Record<CardPadding, string | undefined> = {
  none: styles.paddingNone,
  sm: styles.paddingSm,
  md: styles.paddingMd,
  lg: styles.paddingLg,
};

type CardProps<T extends ElementType> = {
  /** Semantic element to render: use "article" or "section" when the card is a standalone unit. */
  as?: T;
  padding?: CardPadding;
  elevated?: boolean;
} & Omit<ComponentProps<T>, "as">;

export function Card<T extends ElementType = "div">({
  as,
  padding = "md",
  elevated = false,
  className,
  ...rest
}: CardProps<T>) {
  const Component: ElementType = as ?? "div";

  return (
    <Component
      className={clsx(
        styles.card,
        paddingClass[padding],
        elevated && styles.elevated,
        className,
      )}
      {...rest}
    />
  );
}
