"use client";

import { clsx } from "clsx";
import { X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import styles from "./Dialog.module.scss";

// Radix handles the hard accessibility parts: focus trap, focus return,
// Escape to close, scroll lock, aria-modal and inert background.
export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

type DialogContentProps = Omit<ComponentProps<typeof RadixDialog.Content>, "title"> & {
  /** Required: every dialog needs an accessible name. */
  title: ReactNode;
  description?: ReactNode;
  /** Accessible label for the X button, e.g. a translated "Close". */
  closeLabel: string;
  footer?: ReactNode;
};

/**
 * Bottom sheet on phones (thumb-reachable, like native apps), centered modal
 * from the `sm` breakpoint up.
 */
export function DialogContent({
  title,
  description,
  closeLabel,
  footer,
  className,
  children,
  ...rest
}: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={styles.overlay} />
      <RadixDialog.Content
        className={clsx(styles.content, className)}
        // Without a description Radix warns; opt out explicitly instead.
        {...(description ? {} : { "aria-describedby": undefined })}
        {...rest}
      >
        <header className={styles.header}>
          <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>
          <RadixDialog.Close className={styles.close} aria-label={closeLabel}>
            <X aria-hidden />
          </RadixDialog.Close>
        </header>
        {description && (
          <RadixDialog.Description className={styles.description}>
            {description}
          </RadixDialog.Description>
        )}
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
