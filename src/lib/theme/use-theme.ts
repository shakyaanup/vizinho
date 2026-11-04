"use client";

import { useSyncExternalStore } from "react";
import { applyTheme, readStoredTheme, subscribeToTheme, type Theme } from "./theme";

/**
 * The saved theme preference, kept in sync across components and tabs.
 * useSyncExternalStore reads localStorage without a hydration mismatch: the
 * server snapshot is "system", and the client value is used after hydration.
 */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    readStoredTheme,
    () => "system" as const,
  );
  return [theme, applyTheme];
}
