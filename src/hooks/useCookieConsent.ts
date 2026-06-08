"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getConsentConfigFromEnv } from "@/lib/consent/config";
import { activateConsentScripts } from "@/lib/consent/load-scripts";
import { readStoredConsent, writeStoredConsent } from "@/lib/consent/storage";

export type ConsentChoice = "granted" | "denied" | null;

export function useCookieConsent() {
  const config = useMemo(() => getConsentConfigFromEnv(), []);
  const [choice, setChoice] = useState<ConsentChoice>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredConsent();
    if (stored === "true") {
      setChoice("granted");
      activateConsentScripts(config);
    } else if (stored === "false") {
      setChoice("denied");
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
    setChoice("denied");
  }, []);

  const visible = ready && choice === null;

  return { visible, choice, accept, decline };
}
