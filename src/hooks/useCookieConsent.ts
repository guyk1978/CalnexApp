"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getConsentConfigFromEnv } from "@/lib/consent/config";
import { activateConsentScripts } from "@/lib/consent/load-scripts";
import { readStoredConsent, writeStoredConsent } from "@/lib/consent/storage";

export type ConsentChoice = "granted" | "pending" | "declined";

function readInitialChoice(): ConsentChoice {
  if (typeof window === "undefined") return "pending";
  return readStoredConsent() === "true" ? "granted" : "pending";
}

export function useCookieConsent() {
  const config = useMemo(() => getConsentConfigFromEnv(), []);
  const [choice, setChoice] = useState<ConsentChoice>(readInitialChoice);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = readStoredConsent();
    if (stored === "true") {
      setChoice("granted");
      activateConsentScripts(config);
    } else {
      setChoice(stored === "false" ? "declined" : "pending");
    }
  }, [config]);

  const accept = useCallback(() => {
    writeStoredConsent(true);
    setChoice("granted");
    activateConsentScripts(config);
  }, [config]);

  const decline = useCallback(() => {
    writeStoredConsent(false);
    setChoice("declined");
  }, []);

  const isOverlayActive = mounted && choice !== "granted";
  const accessDenied = choice === "declined";

  return { isOverlayActive, accessDenied, choice, accept, decline };
}
