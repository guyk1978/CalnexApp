import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact CalnexApp",
  description: "Contact CalnexApp for support, feedback, and business inquiries.",
  alternates: { canonical: "https://calnexapp.com/contact/" },
};

export default function ContactPage() {
  return (
    <main className="container section-space">
      <section className="page-title">
        <p className="eyebrow">Contact</p>
        <h1>We would love your feedback</h1>
        <p className="muted">
          For support or business inquiries, reach us at{" "}
          <a href="mailto:hello@calnexapp.com">
            <strong>hello@calnexapp.com</strong>
          </a>
          .
        </p>
      </section>
      <section className="content-section">
        <p>
          Share feature requests for new tools, including amortization schedules, refinancing, and debt payoff planners.
        </p>
      </section>
    </main>
  );
}
