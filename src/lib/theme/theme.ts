export type Theme = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "vizinho-theme";
const THEME_EVENT = "vizinho-theme-change";

export function isTheme(value: unknown): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * Runs inline in <head> before the first paint, so a saved light/dark choice
 * applies without a flash of the wrong theme. Kept tiny and dependency-free
 * because it executes before any bundle loads. "system" needs no attribute:
 * the CSS follows prefers-color-scheme by default.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : "system";
  } catch {
    return "system"; // storage blocked (private mode, strict settings)
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);

  try {
    if (theme === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not persisted, but still applied for this page view.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** Subscribe to theme changes from this tab or other tabs (storage event). */
export function subscribeToTheme(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    const next = isTheme(event.newValue) ? event.newValue : "system";
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
    onChange();
  };
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
