import type { ConsentScriptConfig } from "./load-scripts";

/** Build-time consent IDs from Cloudflare / .env (NEXT_PUBLIC_*). */
export function getConsentConfigFromEnv(): ConsentScriptConfig {
  return {
    gaId: process.env.NEXT_PUBLIC_GA_ID?.trim() || "",
    adsenseId: process.env.NEXT_PUBLIC_ADSENSE_ID?.trim() || "",
  };
}
