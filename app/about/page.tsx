import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About CalnexApp",
  description:
    "Learn about CalnexApp, a fast and scalable platform for financial calculators and practical money tools.",
  alternates: { canonical: "https://calnexapp.com/about/" },
};

export default function AboutPage() {
  return (
    <main className="container section-space">
      <section className="page-title">
        <p className="eyebrow">About</p>
        <h1>Financial clarity without complexity</h1>
        <p className="muted">
          CalnexApp is a modern financial planning platform designed to help users understand loans, interest, and
          long-term financial impact in seconds.
        </p>
      </section>
      <section className="content-section">
        <p>No signups. No complexity. No friction.</p>
        <p>
          We focus on practical tools that help people make smarter financial decisions — from loan planning to interest
          simulations and affordability analysis.
        </p>
        <p>
          The platform is continuously expanding with new calculators and decision tools built for real-world financial
          scenarios.
        </p>
      </section>
    </main>
  );
}
