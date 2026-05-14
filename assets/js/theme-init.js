/**
 * Synchronous theme resolution — load in <head> BEFORE stylesheets to avoid flash.
 * Preference: localStorage.cn_theme = "dark" | "light" | "system" | null.
 * Default (null or unknown): dark.
 */
(function () {
  try {
    var stored = localStorage.getItem("cn_theme");
    var resolved = "dark";
    if (stored === "light") {
      resolved = "light";
    } else if (stored === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    } else {
      resolved = "dark";
    }
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved === "light" ? "light" : "dark";
  } catch (_err) {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.style.colorScheme = "dark";
  }
})();
