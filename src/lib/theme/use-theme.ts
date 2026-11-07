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

const darkQuery = "(prefers-color-scheme: dark)";

function subscribeToSystemTheme(onChange: () => void) {
  const media = window.matchMedia(darkQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** The theme actually showing ("system" resolved via the OS setting). */
export function useResolvedTheme(): "light" | "dark" {
  const [theme] = useTheme();
  const systemDark = useSyncExternalStore(
    subscribeToSystemTheme,
    () => window.matchMedia(darkQuery).matches,
    () => false,
  );
  if (theme === "system") return systemDark ? "dark" : "light";
  return theme;
}
