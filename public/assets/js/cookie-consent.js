/**
 * Cookie consent — floating industrial-matte banner for static HTML pages.
 * Styles: /assets/css/cookie-consent.css (injected if missing).
 */
(function () {
  "use strict";

  if (window.__CALNEX_COOKIE_CONSENT_INIT__) return;
  window.__CALNEX_COOKIE_CONSENT_INIT__ = true;

  var STORAGE_KEY = "calnexapp_consent_given";
  var LEGACY_KEY = "calnex_consent_granted";
  var CSS_HREF = "/assets/css/cookie-consent.css?v=1";
  var ROOT_ID = "cn-cookie-consent-root";
  var loaded = { ga: false, adsense: false };

  function resolveAssetPath(path) {
    if (typeof window.CalnexPath === "function") return window.CalnexPath(path);
    return path;
  }

  function ensureStylesheet() {
    var href = resolveAssetPath(CSS_HREF);
    if (document.querySelector('link[href="' + href + '"], link[href="' + CSS_HREF + '"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function getConfig() {
    var cfg = window.__CALNEX_CONSENT_CONFIG__ || {};
    return {
      gaId: typeof cfg.gaId === "string" ? cfg.gaId.trim() : "",
      adsenseId: typeof cfg.adsenseId === "string" ? cfg.adsenseId.trim() : "",
    };
  }

  function readStoredConsent() {
    try {
      var current = localStorage.getItem(STORAGE_KEY);
      if (current === "true" || current === "false") return current;
      var legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy === "true" || legacy === "false") {
        localStorage.setItem(STORAGE_KEY, legacy);
        return legacy;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  function writeStoredConsent(granted) {
    try {
      localStorage.setItem(STORAGE_KEY, granted ? "true" : "false");
      localStorage.removeItem(LEGACY_KEY);
    } catch (e) {
      /* ignore */
    }
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

  function removeBanner() {
    var existing = document.getElementById(ROOT_ID);
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
  }

  function createBanner(onAccept, onDecline) {
    removeBanner();
    ensureStylesheet();

    var root = document.createElement("div");
    root.id = ROOT_ID;
    root.className = "cn-cookie-consent";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-labelledby", "cn-cookie-consent-title");
    root.setAttribute("aria-describedby", "cn-cookie-consent-desc");
    root.setAttribute("aria-live", "polite");

    var shell = document.createElement("div");
    shell.className = "cn-cookie-consent__shell";

    var grid = document.createElement("div");
    grid.className = "cn-cookie-consent__grid";

    var copy = document.createElement("div");
    copy.className = "cn-cookie-consent__copy";

    var title = document.createElement("p");
    title.id = "cn-cookie-consent-title";
    title.className = "cn-cookie-consent__title";
    title.textContent = "Cookies & analytics";

    var desc = document.createElement("p");
    desc.id = "cn-cookie-consent-desc";
    desc.className = "cn-cookie-consent__desc";
    desc.textContent =
      "We use optional cookies for analytics (Google Analytics) and may use advertising cookies (Google AdSense) in the future. Accept to enable these scripts; decline to browse without them.";

    copy.appendChild(title);
    copy.appendChild(desc);

    var actions = document.createElement("div");
    actions.className = "cn-cookie-consent__actions";

    var declineBtn = document.createElement("button");
    declineBtn.type = "button";
    declineBtn.className = "cn-cookie-consent__btn cn-cookie-consent__btn--decline";
    declineBtn.textContent = "Decline";
    declineBtn.addEventListener("click", function () {
      onDecline();
      removeBanner();
    });

    var acceptBtn = document.createElement("button");
    acceptBtn.type = "button";
    acceptBtn.className = "cn-cookie-consent__btn cn-cookie-consent__btn--accept";
    acceptBtn.textContent = "Accept";
    acceptBtn.addEventListener("click", function () {
      onAccept();
      removeBanner();
    });

    actions.appendChild(declineBtn);
    actions.appendChild(acceptBtn);
    grid.appendChild(copy);
    grid.appendChild(actions);
    shell.appendChild(grid);
    root.appendChild(shell);

    document.body.appendChild(root);
    return root;
  }

  function init() {
    var config = getConfig();
    var stored = readStoredConsent();

    if (stored === "true") {
      activateConsentScripts(config);
      return;
    }
    if (stored === "false") return;

    createBanner(
      function () {
        writeStoredConsent(true);
        activateConsentScripts(config);
      },
      function () {
        writeStoredConsent(false);
      }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
