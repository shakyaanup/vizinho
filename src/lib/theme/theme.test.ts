import { applyTheme, readStoredTheme, THEME_STORAGE_KEY, themeInitScript } from "./theme";

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("defaults to system", () => {
    expect(readStoredTheme()).toBe("system");
  });

  it("applies and remembers an explicit choice", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(readStoredTheme()).toBe("dark");
  });

  it("system removes the override and the stored value", () => {
    applyTheme("light");
    applyTheme("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("ignores tampered storage values", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "<script>");
    expect(readStoredTheme()).toBe("system");
  });

  it("the inline script applies a saved theme before React loads", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    new Function(themeInitScript)();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
