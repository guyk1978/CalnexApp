"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import {
  COOKIE_BANNER_ROOT_CLASSES,
  COOKIE_BANNER_ROOT_ID,
  COOKIE_BANNER_ROOT_STYLE,
} from "@/lib/consent/banner-classes";
import { CONSENT_CSS_HREF } from "@/lib/consent/constants";
import { publicAsset } from "@/lib/public-asset";

function ensureConsentStylesheet() {
  const href = publicAsset(CONSENT_CSS_HREF);
  if (document.querySelector(`link[href="${href}"], link[href="${CONSENT_CSS_HREF}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function injectCriticalPositioning() {
  if (document.getElementById("cn-cookie-consent-critical")) return;
  const style = document.createElement("style");
  style.id = "cn-cookie-consent-critical";
  style.textContent = `#${COOKIE_BANNER_ROOT_ID}{position:fixed!important;z-index:9999!important;bottom:1rem;left:1rem;right:1rem;max-width:56rem;margin:0 auto;isolation:isolate!important;}`;
  document.head.appendChild(style);
}

/**
 * Floating cookie consent — always portaled to document.body (never footer/layout DOM).
 */
export function CookieBanner() {
  const { visible, accept, decline } = useCookieConsent();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.body);
    ensureConsentStylesheet();
    injectCriticalPositioning();
  }, []);

  if (!portalTarget || !visible) return null;

  return createPortal(
    <div
      id={COOKIE_BANNER_ROOT_ID}
      className={COOKIE_BANNER_ROOT_CLASSES}
      style={COOKIE_BANNER_ROOT_STYLE}
      role="dialog"
      aria-labelledby="cn-cookie-consent-title"
      aria-describedby="cn-cookie-consent-desc"
      aria-live="polite"
      data-cn-cookie-banner="true"
    >
      <div className="cn-cookie-consent__inner flex flex-col items-center justify-between gap-4 md:flex-row md:gap-6">
        <div className="cn-cookie-consent__copy min-w-0 flex-1 text-center md:text-left">
          <p
            id="cn-cookie-consent-title"
            className="cn-cookie-consent__title m-0 mb-1.5 text-[0.9375rem] font-semibold text-neutral-50"
          >
            Cookies &amp; analytics
          </p>
          <p
            id="cn-cookie-consent-desc"
            className="cn-cookie-consent__desc m-0 text-[0.8125rem] leading-relaxed text-neutral-400"
          >
            We use optional cookies for analytics (Google Analytics) and may use advertising cookies
            (Google AdSense) in the future. Accept to enable these scripts; decline to browse without
            them.
          </p>
        </div>
        <div className="cn-cookie-consent__actions flex w-full shrink-0 flex-nowrap items-center justify-center gap-3 md:w-auto md:justify-end">
          <button
            type="button"
            className="cn-cookie-consent__btn cn-cookie-consent__btn--decline"
            onClick={decline}
          >
            Decline
          </button>
          <button
            type="button"
            className="cn-cookie-consent__btn cn-cookie-consent__btn--accept"
            onClick={accept}
          >
            Accept
          </button>
        </div>
      </div>
    </div>,
    portalTarget
  );
}

/** @deprecated Use CookieBanner */
export { CookieBanner as CookieConsentBanner };
