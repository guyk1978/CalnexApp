import type { CSSProperties } from "react";

/** Root shell — Industrial Matte floating card (Tailwind + standalone CSS mirror). */
export const COOKIE_BANNER_ROOT_ID = "cn-cookie-consent-root";

export const COOKIE_BANNER_ROOT_CLASSES =
  "cn-cookie-banner fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-4xl p-6 bg-neutral-900/80 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl";

/** Inline fallback when stylesheets fail or load late. */
export const COOKIE_BANNER_ROOT_STYLE: CSSProperties = {
  position: "fixed",
  bottom: "1rem",
  left: "1rem",
  right: "1rem",
  zIndex: 9999,
  maxWidth: "56rem",
  margin: "0 auto",
  padding: "1.5rem",
  boxSizing: "border-box",
  background: "rgba(23, 23, 23, 0.8)",
  WebkitBackdropFilter: "blur(40px)",
  backdropFilter: "blur(40px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "0.75rem",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.55)",
  fontFamily:
    'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  color: "#f5f5f5",
  isolation: "isolate",
  pointerEvents: "auto",
};
