import type { Metadata } from "next";
import Script from "next/script";
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
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/assets/css/style.css" />
      </head>
      <body>
        <Script src="/assets/js/theme-init.js" strategy="beforeInteractive" />
        {children}
        <Script src="/assets/js/app.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
