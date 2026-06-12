"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getConsentConfigFromEnv } from "@/lib/consent/config";
import { activateConsentScripts } from "@/lib/consent/load-scripts";
import { readStoredConsent, writeStoredConsent } from "@/lib/consent/storage";

export type ConsentChoice = "granted" | "pending" | "declined";

export function useCookieConsent() {
  const config = useMemo(() => getConsentConfigFromEnv(), []);
  const [choice, setChoice] = useState<ConsentChoice>("pending");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredConsent();
    if (stored === "true") {
      setChoice("granted");
      activateConsentScripts(config);
    } else {
      setChoice("pending");
    }
    setReady(true);
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

  const isOverlayActive = ready && choice !== "granted";
  const accessDenied = choice === "declined";

  return { isOverlayActive, accessDenied, choice, accept, decline };
}
