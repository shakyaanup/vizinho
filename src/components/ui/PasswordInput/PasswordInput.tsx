"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Input, type InputProps } from "../Input";
import styles from "./PasswordInput.module.scss";

type PasswordInputProps = Omit<InputProps, "type"> & {
  /** Translated labels for the visibility toggle. */
  showLabel: string;
  hideLabel: string;
};

/** Password field with a show/hide toggle (fewer typos on mobile keyboards). */
export function PasswordInput({ showLabel, hideLabel, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.wrapper}>
      <Input {...props} type={visible ? "text" : "password"} className={styles.input} />
      <button
        type="button"
        className={styles.toggle}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      </button>
    </div>
  );
}
