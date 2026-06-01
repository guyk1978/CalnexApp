"use client";

import { useEffect, useState } from "react";

/** True after mount — use to defer browser-only values and avoid hydration mismatches. */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
