import type { Metadata } from "next";
import Script from "next/script";
import { SiteChromeBoot } from "@/components/layout/SiteChromeBoot";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { publicAsset, siteScripts, siteStylesheets } from "@/lib/public-asset";
import "./globals.css";

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
        {siteStylesheets.map((href) => (
          <link key={href} rel="stylesheet" href={publicAsset(href)} />
        ))}
      </head>
      <body>
        <Script src={publicAsset(siteScripts.themeInit)} strategy="beforeInteractive" />
        <SiteHeader />
        {children}
        <SiteFooter />
        <SiteChromeBoot />
        <Script src={publicAsset(siteScripts.headerToolbar)} strategy="afterInteractive" />
        <Script src={publicAsset("/assets/js/geo-finance.js")} strategy="afterInteractive" />
        <Script src={publicAsset("/assets/js/currency.js")} strategy="afterInteractive" />
        <Script src={publicAsset("/assets/js/geo-currency-sync.js")} strategy="afterInteractive" />
        <Script src={publicAsset(siteScripts.uiEnhancements)} strategy="afterInteractive" />
        <Script src={publicAsset(siteScripts.app)} strategy="afterInteractive" />
      </body>
    </html>
  );
}
