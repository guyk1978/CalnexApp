import type { Metadata } from "next";
import { HomePageContent } from "@/components/home/HomePageContent";

export const metadata: Metadata = {
  title: "CalnexApp - Financial Calculator Platform",
  description:
    "CalnexApp: fast loan and mortgage calculators with amortization, exports, and guides—built for borrowers who want numbers they can trust.",
  alternates: { canonical: "https://calnexapp.com/" },
  openGraph: {
    type: "website",
    title: "CalnexApp - Financial Calculator Platform",
    description: "Use CalnexApp tools to make smarter borrowing and repayment decisions.",
    url: "https://calnexapp.com/",
    siteName: "CalnexApp",
  },
};

/** Marketing homepage — mirrors static index.html main content (no redirect). */
export default function HomePage() {
  return <HomePageContent />;
}
