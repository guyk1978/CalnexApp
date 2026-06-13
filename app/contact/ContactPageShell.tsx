"use client";

import { useEffect } from "react";

export function ContactPageShell() {
  useEffect(() => {
    document.body.classList.add("cn-contact-page", "cn-site-chrome");
    return () => {
      document.body.classList.remove("cn-contact-page", "cn-site-chrome");
    };
  }, []);

  return (
    <main className="cn-contact-main">
      <div className="cn-contact-inner">
        <header className="cn-contact-header">
          <h1 className="cn-contact-header__title">Contact</h1>
          <p className="cn-contact-header__subtitle">We would love your feedback</p>
        </header>

        <section className="cn-contact-action" aria-label="Contact information">
          <p className="cn-contact-action__label">Reach us directly</p>
          <a href="mailto:hello@calnexapp.com" className="cn-contact-email">
            hello@calnexapp.com
          </a>
          <p className="cn-contact-action__lede">
            For support, partnerships, or calculator feedback—send us a note and we will get back to you.
          </p>
          <ul className="cn-contact-list">
            <li>Feature requests for new tools, including amortization schedules and debt payoff planners</li>
            <li>Refinancing scenarios, comparison ideas, and calculator accuracy feedback</li>
            <li>Business inquiries and partnership opportunities</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
