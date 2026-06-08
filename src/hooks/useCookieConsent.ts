"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CONSENT_STORAGE_KEY } from "@/lib/consent/constants";
import { getConsentConfigFromEnv } from "@/lib/consent/config";
import { activateConsentScripts } from "@/lib/consent/load-scripts";

export type ConsentChoice = "granted" | "denied" | null;

export function useCookieConsent() {
  const config = useMemo(() => getConsentConfigFromEnv(), []);
  const [choice, setChoice] = useState<ConsentChoice>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored === "true") {
      setChoice("granted");
      activateConsentScripts(config);
    } else if (stored === "false") {
      setChoice("denied");
    }
    setReady(true);
  }, [config]);

  const accept = useCallback(() => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "true");
    setChoice("granted");
    activateConsentScripts(config);
  }, [config]);

  const decline = useCallback(() => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "false");
    setChoice("denied");
  }, []);

  const visible = ready && choice === null;

  return { visible, choice, accept, decline };
}
