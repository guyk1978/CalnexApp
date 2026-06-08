/**
 * Global cookie consent for static HTML pages (tools, blog, etc.).
 * Next.js App Router pages use layout.tsx CookieBanner — this script skips them.
 * Shadow DOM isolates styles from footer/layout inheritance.
 */
(function () {
  "use strict";

  if (window.__CALNEX_COOKIE_CONSENT_INIT__) return;
  if (document.body && document.body.dataset.cnNextLayout === "true") return;
  if (document.documentElement.dataset.cnNextLayout === "true") return;

  window.__CALNEX_COOKIE_CONSENT_INIT__ = true;

  var STORAGE_KEY = "calnexapp_consent_given";
  var LEGACY_KEY = "calnex_consent_granted";
  var ROOT_ID = "cn-cookie-consent-root";
  var HOST_STYLE =
    "position:fixed;bottom:1rem;left:1rem;right:1rem;z-index:9999;max-width:56rem;margin:0 auto;display:block;pointer-events:none;";
  var SHADOW_CSS = "\n:host {\n  position: fixed !important;\n  bottom: 1rem;\n  left: 1rem;\n  right: 1rem;\n  z-index: 9999 !important;\n  max-width: 56rem;\n  margin: 0 auto;\n  display: block;\n  pointer-events: none;\n  box-sizing: border-box;\n}\n.cn-cookie-banner-panel {\n  pointer-events: auto;\n  box-sizing: border-box;\n  padding: 1.5rem;\n  background: rgba(23, 23, 23, 0.8);\n  -webkit-backdrop-filter: blur(40px);\n  backdrop-filter: blur(40px);\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  border-radius: 0.75rem;\n  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.55);\n  font-family: Inter, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;\n  color: #f5f5f5;\n}\n.cn-cookie-consent__inner {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: space-between;\n  gap: 1rem;\n  width: 100%;\n}\n@media (min-width: 768px) {\n  .cn-cookie-consent__inner {\n    flex-direction: row;\n    align-items: center;\n    gap: 1.5rem;\n  }\n}\n.cn-cookie-consent__copy {\n  min-width: 0;\n  flex: 1 1 auto;\n  text-align: center;\n}\n@media (min-width: 768px) {\n  .cn-cookie-consent__copy { text-align: left; }\n}\n.cn-cookie-consent__title {\n  margin: 0 0 0.35rem;\n  font-size: 0.9375rem;\n  font-weight: 600;\n  color: #fafafa;\n}\n.cn-cookie-consent__desc {\n  margin: 0;\n  font-size: 0.8125rem;\n  line-height: 1.55;\n  color: #a3a3a3;\n}\n.cn-cookie-consent__actions {\n  display: flex;\n  flex-shrink: 0;\n  flex-wrap: nowrap;\n  align-items: center;\n  justify-content: center;\n  gap: 0.75rem;\n  width: 100%;\n}\n@media (min-width: 768px) {\n  .cn-cookie-consent__actions {\n    width: auto;\n    justify-content: flex-end;\n  }\n}\n.cn-cookie-consent__btn {\n  all: unset;\n  box-sizing: border-box;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 2.5rem;\n  padding: 0.5rem 1.25rem;\n  border-radius: 0.5rem;\n  font-size: 0.875rem;\n  font-weight: 600;\n  font-family: inherit;\n  line-height: 1.2;\n  cursor: pointer;\n  white-space: nowrap;\n}\n.cn-cookie-consent__btn--decline { color: #a3a3a3; background: transparent; }\n.cn-cookie-consent__btn--decline:hover { color: #fff; }\n.cn-cookie-consent__btn--accept { color: #fff; background: #2563eb; }\n.cn-cookie-consent__btn--accept:hover { background: #3b82f6; }\n";
  var loaded = { ga: false, adsense: false };

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
    var nodes = document.querySelectorAll("#" + ROOT_ID + ", [data-cn-cookie-banner]");
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node && node.parentNode) node.parentNode.removeChild(node);
    }
    var inFooter = document.querySelectorAll("footer .cn-cookie-consent__title, .site-footer .cn-cookie-consent__title");
    for (var j = 0; j < inFooter.length; j++) {
      var el = inFooter[j];
      var root = el.closest("#" + ROOT_ID) || el.closest("[data-cn-cookie-banner]") || el.closest(".cn-cookie-consent__inner");
      if (root && root.parentNode) root.parentNode.removeChild(root);
    }
  }

  function mountHost(host) {
    if (host.parentNode !== document.body) {
      if (host.parentNode) host.parentNode.removeChild(host);
      document.body.insertBefore(host, document.body.firstChild);
    }
  }

  function createBanner(onAccept, onDecline) {
    removeBanner();

    var host = document.createElement("div");
    host.id = ROOT_ID;
    host.setAttribute("data-cn-cookie-banner", "true");
    host.setAttribute("data-cn-static-consent", "true");
    host.setAttribute("style", HOST_STYLE);
    host.setAttribute("role", "presentation");

    var shadow = host.attachShadow({ mode: "open" });

    var style = document.createElement("style");
    style.textContent = SHADOW_CSS;
    shadow.appendChild(style);

    var panel = document.createElement("div");
    panel.className = "cn-cookie-banner-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-labelledby", "cn-cookie-consent-title");
    panel.setAttribute("aria-describedby", "cn-cookie-consent-desc");
    panel.setAttribute("aria-live", "polite");

    var inner = document.createElement("div");
    inner.className = "cn-cookie-consent__inner";

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
    inner.appendChild(copy);
    inner.appendChild(actions);
    panel.appendChild(inner);
    shadow.appendChild(panel);

    mountHost(host);
    return host;
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
