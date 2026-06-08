/**
 * Cookie consent banner + deferred script loading for static HTML pages.
 * Config: window.__CALNEX_CONSENT_CONFIG__ (consent-config.js, built from env).
 */
(function () {
  "use strict";

  var STORAGE_KEY = "calnex_consent_granted";
  var loaded = { ga: false, adsense: false };

  function getConfig() {
    var cfg = window.__CALNEX_CONSENT_CONFIG__ || {};
    return {
      gaId: typeof cfg.gaId === "string" ? cfg.gaId.trim() : "",
      adsenseId: typeof cfg.adsenseId === "string" ? cfg.adsenseId.trim() : "",
    };
  }

  function loadGoogleAnalytics(gaId) {
    if (!gaId || loaded.ga) return;
    loaded.ga = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(gaId);
    document.head.appendChild(script);
    window.gtag("js", new Date());
    window.gtag("config", gaId, { anonymize_ip: true });
  }

  function loadAdSense(adsenseId) {
    if (!adsenseId || loaded.adsense) return;
    loaded.adsense = true;
    var script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
      encodeURIComponent(adsenseId);
    document.head.appendChild(script);
    window.adsbygoogle = window.adsbygoogle || [];
  }

  function activateConsentScripts(config) {
    if (config.gaId) loadGoogleAnalytics(config.gaId);
    if (config.adsenseId) loadAdSense(config.adsenseId);
  }

  function hideBanner(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function createBanner(onAccept, onDecline) {
    var root = document.createElement("div");
    root.className = "cn-cookie-consent";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-labelledby", "cn-cookie-consent-title");
    root.setAttribute("aria-describedby", "cn-cookie-consent-desc");
    root.setAttribute("aria-live", "polite");

    root.innerHTML =
      '<div class="cn-cookie-consent__inner">' +
      '<div class="cn-cookie-consent__copy">' +
      '<p id="cn-cookie-consent-title" class="cn-cookie-consent__title">Cookies &amp; analytics</p>' +
      '<p id="cn-cookie-consent-desc" class="cn-cookie-consent__desc">We use optional cookies for analytics (Google Analytics) and may use advertising cookies (Google AdSense) in the future. Accept to enable these scripts; decline to browse without them.</p>' +
      "</div>" +
      '<div class="cn-cookie-consent__actions">' +
      '<button type="button" class="cn-cookie-consent__btn cn-cookie-consent__btn--decline">Decline</button>' +
      '<button type="button" class="cn-cookie-consent__btn cn-cookie-consent__btn--accept">Accept</button>' +
      "</div>" +
      "</div>";

    root.querySelector(".cn-cookie-consent__btn--accept").addEventListener("click", function () {
      onAccept();
      hideBanner(root);
    });
    root.querySelector(".cn-cookie-consent__btn--decline").addEventListener("click", function () {
      onDecline();
      hideBanner(root);
    });

    document.body.appendChild(root);
    return root;
  }

  function init() {
    var config = getConfig();
    var stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      stored = null;
    }

    if (stored === "true") {
      activateConsentScripts(config);
      return;
    }
    if (stored === "false") return;

    createBanner(
      function () {
        try {
          localStorage.setItem(STORAGE_KEY, "true");
        } catch (e) {
          /* ignore */
        }
        activateConsentScripts(config);
      },
      function () {
        try {
          localStorage.setItem(STORAGE_KEY, "false");
        } catch (e) {
          /* ignore */
        }
      }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
