import { CONSENT_STORAGE_KEY, LEGACY_CONSENT_STORAGE_KEY } from "./constants";

export type StoredConsent = "true" | "false" | null;

export function readStoredConsent(): StoredConsent {
  if (typeof window === "undefined") return null;
  try {
    const current = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (current === "true" || current === "false") return current;
    const legacy = localStorage.getItem(LEGACY_CONSENT_STORAGE_KEY);
    if (legacy === "true" || legacy === "false") {
      localStorage.setItem(CONSENT_STORAGE_KEY, legacy);
      return legacy;
    }
  } catch {
    /* private browsing */
  }
  return null;
}

export function writeStoredConsent(granted: boolean): void {
  const value = granted ? "true" : "false";
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, value);
    localStorage.removeItem(LEGACY_CONSENT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
