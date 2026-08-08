"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const themeChangeEventName = "open-blog-theme-change";

function getThemeFromDocument(): Theme {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function subscribeThemeChange(callback: () => void) {
  window.addEventListener(themeChangeEventName, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(themeChangeEventName, callback);
    window.removeEventListener("storage", callback);
  };
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem("theme", theme);
  window.dispatchEvent(new Event(themeChangeEventName));
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeThemeChange,
    getThemeFromDocument,
    getServerSnapshot
  );

  const isDark = theme === "dark";

  function toggleTheme() {
    applyTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
      title={isDark ? "切换到浅色模式" : "切换到深色模式"}
    >
      <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
      <span>{isDark ? "浅色" : "深色"}</span>
    </button>
  );
}