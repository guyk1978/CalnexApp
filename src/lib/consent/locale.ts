/** Document language / direction for cookie consent copy and layout. */
export function getConsentDirection(): "rtl" | "ltr" {
  if (typeof document === "undefined") return "ltr";
  const html = document.documentElement;
  if (html.dir === "rtl") return "rtl";
  const lang = (html.lang || "").toLowerCase();
  if (lang === "he" || lang.startsWith("he-")) return "rtl";
  return "ltr";
}

export function isRtlConsentLocale(): boolean {
  return getConsentDirection() === "rtl";
}
