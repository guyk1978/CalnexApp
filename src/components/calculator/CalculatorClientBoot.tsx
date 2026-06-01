"use client";

import { useEffect } from "react";

type SiteBootWindow = Window & {
  CalnexSiteBoot?: {
    bootCalculatorLegacy?: () => Promise<void>;
    bindHeaderSelectors?: () => void;
    initLegacyCalculatorUi?: () => void;
  };
};

/**
 * Loads legacy share/PDF scripts once (skips tags already in static HTML) and wires UI.
 */
export function CalculatorClientBoot() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const win = window as SiteBootWindow;
    let cancelled = false;

    const waitForSiteBoot = (attempts = 40) =>
      new Promise<void>((resolve) => {
        const tick = (left: number) => {
          if (win.CalnexSiteBoot || left <= 0) {
            resolve();
            return;
          }
          window.setTimeout(() => tick(left - 1), 25);
        };
        tick(attempts);
      });

    const boot = async () => {
      await waitForSiteBoot();
      if (cancelled) return;

      win.CalnexSiteBoot?.bindHeaderSelectors?.();

      if (win.CalnexSiteBoot?.bootCalculatorLegacy) {
        await win.CalnexSiteBoot.bootCalculatorLegacy();
        return;
      }

      win.CalnexSiteBoot?.initLegacyCalculatorUi?.();
    };

    void boot();

    const onHeaderUpdate = () => win.CalnexSiteBoot?.bindHeaderSelectors?.();
    document.addEventListener("cn-header:updated", onHeaderUpdate);

    return () => {
      cancelled = true;
      document.removeEventListener("cn-header:updated", onHeaderUpdate);
    };
  }, []);

  return null;
}
