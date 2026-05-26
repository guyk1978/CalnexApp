import type { Metadata } from "next";
import { SiteNav } from "@/components/layout/SiteNav";
import { RentVsBuyCalculator } from "@/components/rent-vs-buy/RentVsBuyCalculator";

const PAGE_URL = "https://calnexapp.com/tools/rent-vs-buy/";
const PAGE_TITLE = "Rent vs. Buy Calculator — Long-Term Housing Cost Comparison";
const PAGE_DESCRIPTION =
  "Compare renting versus buying a home over 10–30 years. Factor in rent inflation, mortgage costs, property taxes, maintenance, home appreciation, and investment opportunity cost.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  openGraph: {
    type: "website",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    siteName: "CalnexApp",
  },
  alternates: {
    canonical: PAGE_URL,
  },
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Rent vs. Buy Calculator",
  description: PAGE_DESCRIPTION,
  url: PAGE_URL,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  breadcrumb: {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://calnexapp.com/" },
      { "@type": "ListItem", position: 2, name: "Tools", item: "https://calnexapp.com/tools/" },
      { "@type": "ListItem", position: 3, name: "Rent vs. Buy Calculator", item: PAGE_URL },
    ],
  },
};

export default function RentVsBuyPage() {
  return (
    <>
      <SiteNav />
      <main className="container section-space">
      <section className="page-title">
        <p className="eyebrow">Housing</p>
        <h1>Rent vs. buy calculator</h1>
        <p className="muted">
          Model the long-term financial impact of renting versus purchasing a home— including inflation,
          appreciation, and what your down payment could earn if invested instead.
        </p>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />

      <RentVsBuyCalculator />

      <section className="content-section" aria-labelledby="how-it-works">
        <h2 id="how-it-works">How it works</h2>
        <p>
          This calculator builds a year-by-year picture of two parallel paths: continuing to rent while investing
          your would-be down payment, or buying a home and building equity as the property appreciates and the
          mortgage amortizes.
        </p>

        <h3>Factors considered</h3>
        <ul>
          <li>
            <strong>Rent path:</strong> Monthly rent and renter insurance with annual increases, plus compound growth
            on the down payment at your assumed investment return (opportunity cost).
          </li>
          <li>
            <strong>Buy path:</strong> Down payment, fixed-rate mortgage principal and interest, annual property tax
            and maintenance as a percentage of home value, and home price appreciation.
          </li>
          <li>
            <strong>Net worth comparison:</strong> Renter net worth equals invested down payment minus cumulative
            housing cash outflows; buyer net worth equals home equity (market value minus remaining loan balance).
          </li>
          <li>
            <strong>Break-even:</strong> The first year buying shows higher net worth than renting at the same
            assumptions.
          </li>
        </ul>

        <h3>What this tool does not include</h3>
        <p className="muted">
          Closing costs, HOA fees, tax deductions, transaction costs on sale, and local market risk are not modeled.
          Use results for directional planning—not as lending or tax advice.
        </p>
      </section>
    </main>
    </>
  );
}
