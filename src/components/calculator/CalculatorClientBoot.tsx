"use client";

import { useEffect } from "react";
import { publicAsset } from "@/lib/public-asset";

type LegacyWindow = Window & {
  CalnexPath?: (path: string) => string;
  CurrencyLayer?: { bindExistingSelectors?: () => void };
  GeoFinance?: { bindExistingSelectors?: () => void };
  CalnexCalculatorShare?: unknown;
  CalnexCalculatorShareInit?: { init?: () => void };
  CalnexPdfExport?: unknown;
  CalnexPdfExportInit?: { init?: () => void };
};

const PDF_SCRIPTS = [
  "/assets/js/vendor/jspdf.umd.min.js",
  "/assets/js/pdf-joinmypdf-promo.config.js",
  "/assets/js/pdf-report-generator.js",
  "/assets/js/pdf-export-helpers.js",
  "/assets/js/pdf-export.js",
  "/assets/js/pdf-export-init.js",
] as const;

const SHARE_SCRIPTS = ["/assets/js/calculator-share.js", "/assets/js/calculator-share-init.js"] as const;

function resolveAsset(path: string): string {
  const win = window as LegacyWindow;
  return win.CalnexPath ? win.CalnexPath(path) : publicAsset(path);
}

function loadScriptOnce(src: string): Promise<void> {
  const key = resolveAsset(src);
  const safeKey = key.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  if (document.querySelector(`script[data-cn-boot-src="${safeKey}"]`)) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = key;
    script.defer = true;
    script.dataset.cnBootSrc = key;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.append(script);
  });
}

async function loadScriptChain(paths: readonly string[]) {
  for (const src of paths) {
    await loadScriptOnce(src);
  }
}

function bindHeaderSelectors() {
  const win = window as LegacyWindow;
  win.CurrencyLayer?.bindExistingSelectors?.();
  win.GeoFinance?.bindExistingSelectors?.();
}

function isReactCalculatorMounted() {
  return Boolean(document.querySelector("[data-cn-react-calculator='true']"));
}

/**
 * Static-export safety net: legacy share/PDF scripts + header selector binding.
 * Skips share menu wiring when the React calculator island has mounted.
 */
export function CalculatorClientBoot() {
  useEffect(() => {
    bindHeaderSelectors();

    let cancelled = false;

    const boot = async () => {
      bindHeaderSelectors();

      try {
        if (!isReactCalculatorMounted()) {
          await loadScriptChain(SHARE_SCRIPTS);
        }
        await loadScriptChain(PDF_SCRIPTS);
      } catch {
        /* non-fatal — page still renders */
      }

      if (cancelled) return;

      const win = window as LegacyWindow;
      if (!isReactCalculatorMounted()) {
        win.CalnexCalculatorShareInit?.init?.();
      }
      win.CalnexPdfExportInit?.init?.();
    };

    const timer = window.setTimeout(() => {
      void boot();
    }, 100);

    const onHeaderUpdate = () => bindHeaderSelectors();
    document.addEventListener("cn-header:updated", onHeaderUpdate);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("cn-header:updated", onHeaderUpdate);
    };
  }, []);

  return null;
}
