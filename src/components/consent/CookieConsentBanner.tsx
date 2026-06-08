"use client";

import { useCookieConsent } from "@/hooks/useCookieConsent";

export function CookieConsentBanner() {
  const { visible, accept, decline } = useCookieConsent();

  if (!visible) return null;

  return (
    <div
      className="cn-cookie-consent"
      role="dialog"
      aria-labelledby="cn-cookie-consent-title"
      aria-describedby="cn-cookie-consent-desc"
      aria-live="polite"
    >
      <div className="cn-cookie-consent__inner">
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
          <button type="button" className="cn-cookie-consent__btn cn-cookie-consent__btn--decline" onClick={decline}>
            Decline
          </button>
          <button type="button" className="cn-cookie-consent__btn cn-cookie-consent__btn--accept" onClick={accept}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
