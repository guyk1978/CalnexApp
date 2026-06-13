"use client";

import { useEffect } from "react";

export function AboutPageShell() {
  useEffect(() => {
    document.body.classList.add("cn-about-page", "cn-site-chrome");
    return () => {
      document.body.classList.remove("cn-about-page", "cn-site-chrome");
    };
  }, []);

  return (
    <main className="cn-about-main">
      <section className="cn-about-hero" aria-labelledby="cn-about-title">
        <div className="cn-about-hero__backdrop" aria-hidden="true" />
        <div className="cn-about-hero__inner">
          <p className="cn-about-hero__eyebrow">About</p>
          <h1 id="cn-about-title" className="cn-about-hero__title">
            Financial clarity without complexity
          </h1>
          <p className="cn-about-hero__lede">
            CalnexApp is a financial planning platform built to help you understand loans, interest, and long-term
            impact—in seconds, not spreadsheets.
          </p>
        </div>
      </section>

      <section className="cn-about-manifesto" aria-label="Our approach">
        <div className="cn-about-glass">
          <article className="cn-about-point">
            <h2 className="cn-about-point__headline">No signups. No friction.</h2>
            <p className="cn-about-point__text">
              Open a calculator, change the inputs, and see the numbers move. Your scenarios stay in the page unless
              you choose to export or share—nothing between you and the math.
            </p>
          </article>
          <article className="cn-about-point">
            <h2 className="cn-about-point__headline">Practical tools for real decisions.</h2>
            <p className="cn-about-point__text">
              We focus on the outputs that drive cash flow: monthly payment, total interest, payoff date, and the
              deltas when you tweak rate, term, or extra principal. From loan planning to affordability analysis—built
              for decisions, not demos.
            </p>
          </article>
          <article className="cn-about-point">
            <h2 className="cn-about-point__headline">Built to expand with you.</h2>
            <p className="cn-about-point__text">
              The platform grows with new calculators and explainers as real-world scenarios demand them. Same standard
              amortization math lenders use for estimates—presented so you can scan, compare, and trust what you see.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
