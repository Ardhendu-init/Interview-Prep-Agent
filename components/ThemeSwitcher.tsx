"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DEFAULT_THEME, THEME_LABELS, THEME_STORAGE_KEY, THEMES, isTheme, type Theme } from "../lib/theme";

const SWATCH: Record<Theme, string> = {
  dark: "#3b82f6",
  midnight: "#020617",
  graphite: "#22c55e",
  light: "#2563eb",
};

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Syncs React state with the theme the pre-hydration script (lib/theme.ts) already
    // applied to the DOM from localStorage — that value isn't known during SSR/initial render.
    const current = document.documentElement.getAttribute("data-theme");
    if (isTheme(current)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(current);
    }
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  function applyTheme(next: Theme) {
    setTheme(next);
    setOpen(false);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode) — theme still applies for this page load.
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change theme"
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg-secondary transition-colors hover:border-accent/50 hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: SWATCH[theme] }}
          aria-hidden
        />
        <span className="hidden sm:inline">{THEME_LABELS[theme]}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg"
          >
            {THEMES.map((t) => (
              <li key={t} role="option" aria-selected={t === theme}>
                <button
                  type="button"
                  onClick={() => applyTheme(t)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover ${
                    t === theme ? "text-fg" : "text-fg-secondary"
                  }`}
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: SWATCH[t] }}
                    aria-hidden
                  />
                  {THEME_LABELS[t]}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
