"use client";

import { clsx } from "clsx";
import { Check } from "lucide-react";
import { DropdownMenu as Radix } from "radix-ui";
import type { ComponentProps } from "react";
import styles from "./DropdownMenu.module.scss";

// Radix provides the keyboard model (arrows, Home/End, typeahead, Escape),
// focus management and ARIA menu roles. We only add styling.
export const DropdownMenu = Radix.Root;
export const DropdownMenuTrigger = Radix.Trigger;
export const DropdownMenuGroup = Radix.Group;
export const DropdownMenuRadioGroup = Radix.RadioGroup;

export function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: ComponentProps<typeof Radix.Content>) {
  return (
    <Radix.Portal>
      <Radix.Content
        sideOffset={sideOffset}
        collisionPadding={12}
        className={clsx(styles.content, className)}
        {...props}
      />
    </Radix.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof Radix.Item>) {
  return <Radix.Item className={clsx(styles.item, className)} {...props} />;
}

/**
 * A choice in a DropdownMenuRadioGroup (e.g. theme). Renders its own check
 * indicator, so it doesn't support `asChild`: for links use DropdownMenuItem.
 */
export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Radix.RadioItem>, "asChild">) {
  return (
    <Radix.RadioItem
      className={clsx(styles.item, styles.radioItem, className)}
      {...props}
    >
      <Radix.ItemIndicator className={styles.indicator}>
        <Check aria-hidden />
      </Radix.ItemIndicator>
      {children}
    </Radix.RadioItem>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof Radix.Label>) {
  return <Radix.Label className={clsx(styles.label, className)} {...props} />;
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof Radix.Separator>) {
  return <Radix.Separator className={clsx(styles.separator, className)} {...props} />;
}
