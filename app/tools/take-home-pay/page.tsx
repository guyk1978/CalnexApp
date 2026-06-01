import type { Metadata } from "next";
import Script from "next/script";
import { TakeHomePayCalculator } from "@/components/take-home-pay/TakeHomePayCalculator";
import {
  TakeHomePayBottomSections,
  TakeHomePayConnectedSuite,
  TakeHomePayContextCta,
  TakeHomePayPageSections,
} from "@/components/tools/TakeHomePayPageSections";
import { publicAsset } from "@/lib/public-asset";

export const metadata: Metadata = {
  title: "Take-Home Pay Calculator — Net Salary After Tax",
  description:
    "Estimate net paycheck after federal tax, FICA, and state/local withholding. See monthly, weekly, and annual take-home pay with an interactive breakdown.",
  alternates: { canonical: "https://calnexapp.com/tools/take-home-pay/" },
  openGraph: {
    title: "Take-Home Pay Calculator — Net Salary After Tax | CalnexApp",
    description:
      "Calculate federal, FICA, and state tax estimates to see your true take-home pay.",
    url: "https://calnexapp.com/tools/take-home-pay/",
  },
};

export default function TakeHomePayPage() {
  return (
    <>
      <main className="cn-main-layout pt-10 sm:pt-14 px-4 sm:px-6 max-w-7xl mx-auto" data-page="take-home-pay-calculator">
        <TakeHomePayPageSections />
        <TakeHomePayCalculator />
        <section className="card" data-related-tools data-current-tool="take-home-pay-calculator" aria-live="polite" />
        <TakeHomePayContextCta />
        <TakeHomePayConnectedSuite />
        <TakeHomePayBottomSections />
      </main>

      <div id="cnShareToast" className="share-toast" role="status" aria-live="polite" />
      <div id="cnPdfToast" className="share-toast" role="status" aria-live="polite" />

      <Script src={publicAsset("/assets/js/vendor/jspdf.umd.min.js")} strategy="afterInteractive" />
      <Script src={publicAsset("/assets/js/pdf-joinmypdf-promo.config.js")} strategy="afterInteractive" />
      <Script src={publicAsset("/assets/js/pdf-report-generator.js")} strategy="afterInteractive" />
      <Script src={publicAsset("/assets/js/pdf-export-helpers.js")} strategy="afterInteractive" />
      <Script src={publicAsset("/assets/js/pdf-export.js")} strategy="afterInteractive" />
      <Script src={publicAsset("/assets/js/pdf-export-init.js")} strategy="afterInteractive" />
      <Script src={publicAsset("/assets/js/calculator-share.js")} strategy="afterInteractive" />
      <Script src={publicAsset("/assets/js/calculator-share-init.js")} strategy="afterInteractive" />
    </>
  );
}
