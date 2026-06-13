"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import {
  COOKIE_BANNER_ROOT_ID,
  COOKIE_OVERLAY_CLASSES,
  COOKIE_OVERLAY_STYLE,
  COOKIE_PANEL_CLASSES,
  COOKIE_PANEL_STYLE,
} from "@/lib/consent/banner-classes";
import { getConsentCopy } from "@/lib/consent/copy";
import { CONSENT_CSS_HREF } from "@/lib/consent/constants";
import { getConsentDirection } from "@/lib/consent/locale";
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
  style.textContent = `#${COOKIE_BANNER_ROOT_ID}{position:fixed!important;inset:0!important;z-index:9999!important;pointer-events:none!important;background:transparent!important;-webkit-backdrop-filter:blur(2px)!important;backdrop-filter:blur(2px)!important;}#${COOKIE_BANNER_ROOT_ID} .cn-cookie-banner-panel{pointer-events:auto!important;}`;
  document.head.appendChild(style);
}

/**
 * Mandatory cookie gate — transparent blur overlay blocks the site until Accept.
 * Decline keeps the overlay active and shows an access-denied message.
 */
export function CookieBanner() {
  const { isOverlayActive, accessDenied, accept, decline } = useCookieConsent();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    document
      .querySelectorAll("[data-cn-static-consent]")
      .forEach((node) => node.remove());
    setPortalTarget(document.body);
    ensureConsentStylesheet();
    injectCriticalPositioning();
  }, []);

  if (!portalTarget || !isOverlayActive) return null;

  const dir = getConsentDirection();
  const copy = getConsentCopy(accessDenied);

  return createPortal(
    <div
      id={COOKIE_BANNER_ROOT_ID}
      className={COOKIE_OVERLAY_CLASSES}
      style={COOKIE_OVERLAY_STYLE}
      role="dialog"
      aria-labelledby="cn-cookie-consent-title"
      aria-describedby="cn-cookie-consent-desc"
      aria-live="polite"
      aria-modal="true"
      data-cn-cookie-banner="true"
      dir={dir}
    >
      <div className={COOKIE_PANEL_CLASSES} style={COOKIE_PANEL_STYLE}>
        <div className="cn-cookie-consent__inner flex flex-col items-center justify-between gap-4 md:flex-row md:gap-6">
          <div className="cn-cookie-consent__copy min-w-0 flex-1 text-center md:text-start">
            <p
              id="cn-cookie-consent-title"
              className="cn-cookie-consent__title m-0 mb-1.5 text-[0.9375rem] font-semibold text-neutral-50"
            >
              {copy.title}
            </p>
            <p
              id="cn-cookie-consent-desc"
              className={`cn-cookie-consent__desc m-0 text-[0.8125rem] leading-relaxed ${
                accessDenied ? "cn-cookie-consent__desc--denied text-red-400" : "text-neutral-400"
              }`}
            >
              {copy.description}
            </p>
          </div>
          <div className="cn-cookie-consent__actions flex w-full shrink-0 flex-nowrap items-center justify-center gap-3 md:ms-auto md:w-auto">
            <button
              type="button"
              className="cn-cookie-consent__btn cn-cookie-consent__btn--decline"
              onClick={decline}
            >
              {copy.decline}
            </button>
            <button
              type="button"
              className="cn-cookie-consent__btn cn-cookie-consent__btn--accept"
              onClick={accept}
            >
              {copy.accept}
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalTarget
  );
}

/** Primary export name for layout integration. */
export { CookieBanner as CookieConsent };

/** @deprecated Use CookieConsent */
export { CookieBanner as CookieConsentBanner };
