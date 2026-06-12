import { isRtlConsentLocale } from "./locale";

export type ConsentCopy = {
  title: string;
  description: string;
  accessDenied: string;
  accept: string;
  decline: string;
};

const EN_COPY: ConsentCopy = {
  title: "Cookie policy required",
  description:
    "This site uses cookies for Google Analytics. To continue using our tools, you must accept our cookie policy.",
  accessDenied: "Access denied: You must accept the cookie policy to use this site.",
  accept: "Accept",
  decline: "Decline",
};

const HE_COPY: ConsentCopy = {
  title: "נדרשת מדיניות עוגיות",
  description:
    "אתר זה משתמש בעוגיות עבור Google Analytics. כדי להמשיך להשתמש בכלים שלנו, עליכם לאשר את מדיניות העוגיות.",
  accessDenied: "גישה נדחתה: עליכם לאשר את מדיניות העוגיות כדי להשתמש באתר.",
  accept: "אישור",
  decline: "דחייה",
};

export function getConsentCopy(accessDenied = false): ConsentCopy {
  const base = isRtlConsentLocale() ? HE_COPY : EN_COPY;
  if (!accessDenied) return base;
  return { ...base, description: base.accessDenied };
}
