"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  function toggle() {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this page.
    }
  }

  // Both icons are rendered and CSS picks one, so server and client markup
  // match regardless of the stored theme.
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="rounded-lg p-2 text-haze-600 transition hover:bg-lavender/10 hover:text-haze-950 active:translate-y-px dark:text-haze-300 dark:hover:text-white"
    >
      <Sun className="hidden size-4 dark:block" aria-hidden />
      <Moon className="size-4 dark:hidden" aria-hidden />
    </button>
  );
}
