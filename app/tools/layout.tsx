import type { ReactNode } from "react";

/** Shared shell for App Router calculators (header/search/footer come from root layout). */
export default function ToolsLayout({ children }: { children: ReactNode }) {
  return children;
}
