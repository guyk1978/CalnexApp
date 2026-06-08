"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCookieConsent } from "@/hooks/useCookieConsent";
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

export function CookieConsentBanner() {
  const { visible, accept, decline } = useCookieConsent();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    ensureConsentStylesheet();
  }, []);

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      id="cn-cookie-consent-root"
      className="cn-cookie-consent"
      role="dialog"
      aria-labelledby="cn-cookie-consent-title"
      aria-describedby="cn-cookie-consent-desc"
      aria-live="polite"
    >
      <div className="cn-cookie-consent__shell">
        <div className="cn-cookie-consent__grid">
          <div className="cn-cookie-consent__copy">
            <p id="cn-cookie-consent-title" className="cn-cookie-consent__title">
              Cookies &amp; analytics
            </p>
            <p id="cn-cookie-consent-desc" className="cn-cookie-consent__desc">
              We use optional cookies for analytics (Google Analytics) and may use advertising cookies
              (Google AdSense) in the future. Accept to enable these scripts; decline to browse without
              them.
            </p>
          </div>
          <div className="cn-cookie-consent__actions">
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
      </div>
    </div>,
    document.body
  );
}
