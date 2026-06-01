import { readHomeMainHtml } from "@/lib/home-static-html";

/**
 * Static marketing homepage body (from index.html).
 * Server-rendered HTML avoids Next redirect export bugs on /.
 */
export function HomePageContent() {
  const mainHtml = readHomeMainHtml();
  return <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: mainHtml }} />;
}
