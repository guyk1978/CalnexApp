"use client";

import { useEffect } from "react";

type LegacySearch = { init?: () => void | Promise<void> };

/** Sync body[data-page] from main for calculator scripts. */
export function SiteChromeBoot() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const main = document.querySelector("main[data-page]");
    if (main instanceof HTMLElement && main.dataset.page) {
      document.body.dataset.page = main.dataset.page;
    }

    if (document.querySelector("[data-cn-react-header]") || document.querySelector("[data-cn-react-search]")) {
      return;
    }

    const win = window as Window & { CalnexSiteSearch?: LegacySearch; CalnexPath?: (p: string) => string };
    if (document.getElementById("cn-header-search-trigger")?.dataset.cnSearchBound === "true") return;

    const bootSearch = async () => {
      if (!win.CalnexSiteSearch?.init) {
        const src = win.CalnexPath ? win.CalnexPath("/assets/js/site-search.js") : "/assets/js/site-search.js";
        if (!document.querySelector(`script[src="${src}"]`)) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("site-search failed"));
            document.head.append(script);
          });
        }
      }
      await win.CalnexSiteSearch?.init?.();
    };

    void bootSearch().catch(() => {
      /* app.js also initializes search when legacy scripts load */
    });
  }, []);

  return null;
}
