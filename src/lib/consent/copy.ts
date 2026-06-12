import { isRtlConsentLocale } from "./locale";

export type ConsentCopy = {
  title: string;
  description: string;
  accept: string;
  decline: string;
};

const EN_COPY: ConsentCopy = {
  title: "Cookies & analytics",
  description:
    "We use optional cookies for analytics (Google Analytics) and may use advertising cookies (Google AdSense) in the future. Accept to enable these scripts; decline to browse without them.",
  accept: "Accept",
  decline: "Decline",
};

const HE_COPY: ConsentCopy = {
  title: "עוגיות ואנליטיקה",
  description:
    "אנו משתמשים בעוגיות אופציונליות לניתוח (Google Analytics) וייתכן שנשתמש בעוגיות פרסום (Google AdSense) בעתיד. לחצו אישור כדי להפעיל סקריפטים אלה; דחייה מאפשרת גלישה ללא העוגיות.",
  accept: "אישור",
  decline: "דחייה",
};

export function getConsentCopy(): ConsentCopy {
  return isRtlConsentLocale() ? HE_COPY : EN_COPY;
}
