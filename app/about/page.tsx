import type { Metadata } from "next";
import { AboutPageShell } from "./AboutPageShell";

export const metadata: Metadata = {
  title: "About CalnexApp",
  description:
    "Learn about CalnexApp, a fast and scalable platform for financial calculators and practical money tools.",
  alternates: { canonical: "https://calnexapp.com/about/" },
  openGraph: {
    type: "website",
    title: "About CalnexApp",
    description:
      "CalnexApp helps users make smarter financial decisions through practical tools.",
    url: "https://calnexapp.com/about/",
    siteName: "CalnexApp",
  },
};

export default function AboutPage() {
  return <AboutPageShell />;
}
