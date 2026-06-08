import type { Metadata } from "next";
import Script from "next/script";
import { CookieBanner } from "@/components/consent/CookieBanner";
import { SiteChromeBoot } from "@/components/layout/SiteChromeBoot";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CONSENT_CSS_HREF } from "@/lib/consent/constants";
import { publicAsset, siteScripts, siteStylesheets } from "@/lib/public-asset";
import "./globals.css";

/** Static export: real <script defer> tags so nested routes get app.js without relying on Next Script hydration. */
const DEFERRED_SITE_SCRIPTS = [
  siteScripts.headerToolbar,
  "/assets/js/geo-finance.js",
  "/assets/js/currency.js",
  "/assets/js/geo-currency-sync.js",
  siteScripts.uiEnhancements,
  siteScripts.app,
] as const;

export const metadata: Metadata = {
  title: {
    default: "CalnexApp",
    template: "%s | CalnexApp",
  },
  description: "Premium financial calculators for smarter money decisions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <Script src={publicAsset("/assets/js/calnex-path.js")} strategy="beforeInteractive" />
        {siteStylesheets.map((href) => (
          <link key={href} rel="stylesheet" href={publicAsset(href)} />
        ))}
        <link rel="stylesheet" href={publicAsset(CONSENT_CSS_HREF)} />
      </head>
      <body data-cn-next-layout="true">
        <CookieBanner />
        <Script src={publicAsset(siteScripts.themeInit)} strategy="beforeInteractive" />
        <SiteHeader />
        {children}
        <SiteFooter />
        <SiteChromeBoot />
        {DEFERRED_SITE_SCRIPTS.map((href) => (
          <script key={href} src={publicAsset(href)} defer data-cn-site-boot="true" />
        ))}
      </body>
    </html>
  );
}
