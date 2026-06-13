import type { CSSProperties } from "react";

export const COOKIE_BANNER_ROOT_ID = "cn-cookie-consent-root";

/** Full-viewport Light Blur Teaser overlay — banner panel stays interactive. */
export const COOKIE_OVERLAY_CLASSES =
  "cn-cookie-consent-overlay fixed inset-0 z-[9999] flex items-end justify-center bg-transparent p-4 backdrop-blur-[2px] pointer-events-none";

/** Border-less, shadow-only consent card. */
export const COOKIE_PANEL_CLASSES =
  "cn-cookie-banner-panel cn-cookie-banner w-full max-w-4xl rounded-xl bg-neutral-900 p-6 shadow-2xl";

/** @deprecated Use COOKIE_OVERLAY_CLASSES + COOKIE_PANEL_CLASSES */
export const COOKIE_BANNER_ROOT_CLASSES = COOKIE_PANEL_CLASSES;

/** Inline fallback when stylesheets fail or load late. */
export const COOKIE_OVERLAY_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding: "1rem",
  boxSizing: "border-box",
  background: "transparent",
  WebkitBackdropFilter: "blur(2px)",
  backdropFilter: "blur(2px)",
  pointerEvents: "none",
};

export const COOKIE_PANEL_STYLE: CSSProperties = {
  width: "100%",
  maxWidth: "56rem",
  padding: "1.5rem",
  boxSizing: "border-box",
  background: "#171717",
  border: "none",
  borderRadius: "0.75rem",
  boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.35), 0 8px 16px -8px rgba(0, 0, 0, 0.2)",
  fontFamily:
    'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  color: "#f5f5f5",
  pointerEvents: "auto",
};

/** @deprecated Use COOKIE_OVERLAY_STYLE + COOKIE_PANEL_STYLE */
export const COOKIE_BANNER_ROOT_STYLE: CSSProperties = {
  ...COOKIE_PANEL_STYLE,
  position: "fixed",
  bottom: "1rem",
  left: "1rem",
  right: "1rem",
  margin: "0 auto",
  zIndex: 9999,
  isolation: "isolate",
};
