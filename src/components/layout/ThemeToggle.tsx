"use client";

import { useCallback, useEffect, useState } from "react";

const THEME_KEY = "cn_theme";

type ThemeStored = "dark" | "light" | "system";

function readStoredTheme(): ThemeStored {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "dark";
}

function resolveTheme(stored: ThemeStored): "dark" | "light" {
  if (stored === "light") return "light";
  if (stored === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

function applyTheme(resolved: "dark" | "light") {
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.style.colorScheme = resolved === "light" ? "light" : "dark";
  document.dispatchEvent(new CustomEvent("cn-themechange", { detail: { theme: resolved } }));
}

function cycleTheme(current: ThemeStored): ThemeStored {
  if (current === "dark") return "light";
  if (current === "light") return "system";
  return "dark";
}

function themeLabel(stored: ThemeStored): string {
  if (stored === "system") return "System theme";
  if (stored === "light") return "Light theme";
  return "Dark theme";
}

function ThemeIcon({ mode }: { mode: ThemeStored }) {
  if (mode === "light") {
    return (
      <svg className="cn-theme-toggle__icon" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }
  if (mode === "system") {
    return (
      <svg className="cn-theme-toggle__icon" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        <path d="M19 3v4M21 5h-4" />
      </svg>
    );
  }
  return (
    <svg className="cn-theme-toggle__icon" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ThemeToggle() {
  const [stored, setStored] = useState<ThemeStored>("dark");

  useEffect(() => {
    const initial = readStoredTheme();
    setStored(initial);
    applyTheme(resolveTheme(initial));

    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onOs = () => {
      if (readStoredTheme() === "system") applyTheme(resolveTheme("system"));
    };
    mq.addEventListener("change", onOs);
    return () => mq.removeEventListener("change", onOs);
  }, []);

  const onClick = useCallback(() => {
    const next = cycleTheme(stored);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
    setStored(next);
    applyTheme(resolveTheme(next));
  }, [stored]);

  return (
    <button
      type="button"
      id="cn-theme-toggle"
      className="cn-theme-toggle"
      aria-label={themeLabel(stored)}
      title={themeLabel(stored)}
      onClick={onClick}
    >
      <ThemeIcon mode={stored} />
    </button>
  );
}
