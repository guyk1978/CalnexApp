"use client";

import { useEffect } from "react";

/** Sync body[data-page] from main for calculator scripts. */
export function SiteChromeBoot() {
  useEffect(() => {
    const main = document.querySelector("main[data-page]");
    if (main instanceof HTMLElement && main.dataset.page) {
      document.body.dataset.page = main.dataset.page;
    }
  }, []);

  return null;
}
