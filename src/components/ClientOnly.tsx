"use client";

import { useIsClient } from "@/hooks/useIsClient";

type ClientOnlyProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/** Render children only after mount — avoids hydration mismatches for browser-only UI. */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const isClient = useIsClient();
  if (!isClient) return <>{fallback}</>;
  return <>{children}</>;
}
