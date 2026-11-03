"use client";

import { Moon, Package, Sun, SunMoon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import styles from "./styleguide.module.scss";

type Theme = "system" | "light" | "dark";

function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("system");

  function apply(next: Theme) {
    setTheme(next);
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
  }

  const options = [
    { value: "system", label: "System", Icon: SunMoon },
    { value: "light", label: "Light", Icon: Sun },
    { value: "dark", label: "Dark", Icon: Moon },
  ] as const;

  return (
    <div role="group" aria-label="Theme" className={styles.row}>
      {options.map(({ value, label, Icon }) => (
        <Button
          key={value}
          variant={theme === value ? "primary" : "secondary"}
          aria-pressed={theme === value}
          onClick={() => apply(value)}
        >
          <Icon aria-hidden /> {label}
        </Button>
      ))}
    </div>
  );
}

function ToastButtons() {
  const { toast } = useToast();
  return (
    <div className={styles.row}>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            title: "Reservation requested",
            description: "Ana will reply within 24 hours.",
          })
        }
      >
        Info toast
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast({ title: "Parcel checked in", variant: "success" })}
      >
        Success toast
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            title: "Pickup code expired",
            description: "Generate a new code to continue.",
            variant: "error",
          })
        }
      >
        Error toast
      </Button>
    </div>
  );
}

export function StyleguideDemo() {
  const [email, setEmail] = useState("");
  const emailError =
    email && !/^\S+@\S+\.\S+$/.test(email) ? "Enter a valid email address." : undefined;

  return (
    <ToastProvider closeLabel="Dismiss" viewportLabel="Notifications">
      <section aria-labelledby="theme-heading" className={styles.section}>
        <h2 id="theme-heading">Theme</h2>
        <ThemeSwitcher />
      </section>

      <section aria-labelledby="buttons-heading" className={styles.section}>
        <h2 id="buttons-heading">Buttons</h2>
        <div className={styles.row}>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div className={styles.row}>
          <Button size="lg">
            <Package aria-hidden /> Reserve pickup
          </Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button asChild variant="secondary">
            <a href="#forms-heading">Link styled as button</a>
          </Button>
        </div>
        <Button fullWidth size="lg">
          Full width (mobile CTA)
        </Button>
        <p className={styles.row}>
          <Spinner label="Loading" />{" "}
          <span className={styles.muted}>Standalone spinner</span>
        </p>
      </section>

      <section aria-labelledby="forms-heading" className={styles.section}>
        <h2 id="forms-heading">Form fields</h2>
        <form className={styles.form} noValidate onSubmit={(e) => e.preventDefault()}>
          <Field
            label="Email"
            hint="Type an invalid address to see the error state."
            error={emailError}
            required
            requiredIndicator="(required)"
          >
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Postal code" hint="Format: 1000-001">
            <Input inputMode="numeric" placeholder="1000-001" />
          </Field>
          <Field label="Disabled">
            <Input disabled value="Not editable" readOnly />
          </Field>
        </form>
      </section>

      <section aria-labelledby="overlays-heading" className={styles.section}>
        <h2 id="overlays-heading">Dialog and toasts</h2>
        <p className={styles.muted}>
          The dialog is a bottom sheet on phones and a centered modal on larger screens.
        </p>
        <div className={styles.row}>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open dialog</Button>
            </DialogTrigger>
            <DialogContent
              title="Cancel reservation?"
              description="The host will be notified and the address hidden again."
              closeLabel="Close"
              footer={
                <>
                  <DialogClose asChild>
                    <Button variant="secondary">Keep reservation</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="danger">Cancel reservation</Button>
                  </DialogClose>
                </>
              }
            >
              <p className={styles.muted}>Reference VZ-7K3QPM · Expected Thu, 14 Nov</p>
            </DialogContent>
          </Dialog>
        </div>
        <ToastButtons />
      </section>
    </ToastProvider>
  );
}
