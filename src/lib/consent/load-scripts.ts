export type ConsentScriptConfig = {
  gaId?: string;
  adsenseId?: string;
};

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
    adsbygoogle?: unknown[];
  }
}

const loaded = { ga: false, adsense: false };

/** Inject Google Analytics (gtag.js) — call only after consent. */
export function loadGoogleAnalytics(gaId: string): void {
  if (!gaId || typeof window === "undefined" || loaded.ga) return;
  loaded.ga = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", gaId, { anonymize_ip: true });
}

/** Inject AdSense — call only after consent. Add client ID via NEXT_PUBLIC_ADSENSE_ID. */
export function loadAdSense(adsenseId: string): void {
  if (!adsenseId || typeof window === "undefined" || loaded.adsense) return;
  loaded.adsense = true;

  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseId)}`;
  document.head.appendChild(script);

  window.adsbygoogle = window.adsbygoogle || [];
}

/** Activate all configured third-party scripts (extend here for new vendors). */
export function activateConsentScripts(config: ConsentScriptConfig): void {
  if (config.gaId) loadGoogleAnalytics(config.gaId);
  if (config.adsenseId) loadAdSense(config.adsenseId);
}
