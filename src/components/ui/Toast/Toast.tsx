"use client";

import { clsx } from "clsx";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { Toast as RadixToast } from "radix-ui";
import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import styles from "./Toast.module.scss";

export type ToastVariant = "info" | "success" | "error";

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Milliseconds before auto-dismiss. Errors stay longer by default. */
  duration?: number;
};

type ToastItem = ToastOptions & { id: number };

type ToastContextValue = { toast: (options: ToastOptions) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

const icons = { info: Info, success: CircleCheck, error: CircleAlert } as const;

let nextId = 0;

type ToastProviderProps = {
  children: ReactNode;
  /** Accessible label for each toast's dismiss button, e.g. a translated "Dismiss". */
  closeLabel: string;
  /** Accessible name for the notification region, e.g. a translated "Notifications". */
  viewportLabel: string;
};

export function ToastProvider({
  children,
  closeLabel,
  viewportLabel,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((options: ToastOptions) => {
    setToasts((current) => [...current, { ...options, id: nextId++ }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext value={value}>
      <RadixToast.Provider swipeDirection="down" label={viewportLabel}>
        {children}

        {toasts.map(({ id, title, description, variant = "info", duration }) => {
          const Icon = icons[variant];
          return (
            <RadixToast.Root
              key={id}
              className={clsx(styles.toast, styles[variant])}
              duration={duration ?? (variant === "error" ? 8000 : 5000)}
              // Errors interrupt the screen reader; others wait politely.
              type={variant === "error" ? "foreground" : "background"}
              onOpenChange={(open) => !open && remove(id)}
            >
              <Icon className={styles.icon} aria-hidden />
              <div className={styles.text}>
                <RadixToast.Title className={styles.title}>{title}</RadixToast.Title>
                {description && (
                  <RadixToast.Description className={styles.description}>
                    {description}
                  </RadixToast.Description>
                )}
              </div>
              <RadixToast.Close className={styles.close} aria-label={closeLabel}>
                <X aria-hidden />
              </RadixToast.Close>
            </RadixToast.Root>
          );
        })}

        <RadixToast.Viewport className={styles.viewport} />
      </RadixToast.Provider>
    </ToastContext>
  );
}

/** Show a toast from any client component inside <ToastProvider>. */
export function useToast() {
  const context = use(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return context;
}
