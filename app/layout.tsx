import type { Metadata } from "next";
import Script from "next/script";
import { CookieConsent } from "@/components/consent/CookieBanner";
import { SiteChromeBoot } from "@/components/layout/SiteChromeBoot";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CONSENT_CSS_HREF, CONSENT_JS_SRC } from "@/lib/consent/constants";
import { publicAsset, siteScripts, siteStylesheets, versionedScript } from "@/lib/public-asset";
import "./globals.css";

/** Static export: legacy script tags (React header owns search + geo pills). */
const DEFERRED_SITE_SCRIPTS = [
  versionedScript(siteScripts.headerToolbar),
  versionedScript(siteScripts.geoFinance),
  versionedScript(siteScripts.currency),
  versionedScript(siteScripts.geoCurrencySync),
  versionedScript(siteScripts.uiEnhancements),
  versionedScript(siteScripts.app),
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href={publicAsset(CONSENT_CSS_HREF)} />
        <script src={publicAsset(CONSENT_JS_SRC)} defer />
      </head>
      <body data-cn-next-layout="true">
        <CookieConsent />
        <Script src={versionedScript(siteScripts.themeInit)} strategy="beforeInteractive" />
        <SiteHeader />
        {children}
        <SiteFooter />
        <SiteChromeBoot />
        {DEFERRED_SITE_SCRIPTS.map((src) => (
          <script key={src} src={src} defer data-cn-site-boot="true" />
        ))}
      </body>
    </html>
  );
}
