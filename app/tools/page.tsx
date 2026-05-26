import type { Metadata } from "next";
import { ToolsHub } from "@/components/tools/ToolsHub";
import { SiteNav } from "@/components/layout/SiteNav";

export const metadata: Metadata = {
  title: "CalnexApp Tools",
  description:
    "Browse CalnexApp calculators: loans, mortgages, rent vs buy, auto loans, interest, and retirement planning.",
  alternates: { canonical: "https://calnexapp.com/tools/" },
};

export default function ToolsHubPage() {
  return (
    <>
      <SiteNav />
      <main className="container section-space">
        <section className="page-title">
          <p className="eyebrow">Tools hub</p>
          <h1>Pick a calculator. Leave the guesswork.</h1>
          <p className="muted">
            Every tool opens on the numbers that drive a decision—payment, interest load, payoff—then gives you
            tables and exports when you want receipts.
          </p>
        </section>
        <section style={{ paddingTop: 0 }}>
          <h2 className="sr-only">All calculators</h2>
          <ToolsHub />
        </section>
      </main>
    </>
  );
}
