import Link from "next/link";

const HOUSING_LINKS = [
  { href: "/tools/mortgage-calculator/", label: "Mortgage Calculator" },
  { href: "/tools/rent-vs-buy/", label: "Rent vs. Buy Calculator" },
];

const LENDING_LINKS = [{ href: "/tools/loan-calculator/", label: "Loan Calculator" }];

const OTHER_LINKS = [
  { href: "/tools/car-loan-calculator/", label: "Car Loan Calculator" },
  { href: "/tools/interest-calculator/", label: "Interest Calculator" },
  { href: "/tools/retirement-calculator/", label: "Retirement Calculator" },
];

function NavGroup({ label, links }: { label: string; links: { href: string; label: string }[] }) {
  return (
    <div className="cn-nav-dropdown__group">
      <p className="cn-nav-dropdown__label">{label}</p>
      {links.map((item) => (
        <Link key={item.href} href={item.href} className="cn-nav-dropdown__link" role="menuitem">
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function SiteNav() {
  return (
    <header className="site-header">
      <div className="container nav">
        <Link href="/" className="brand">
          CalnexApp
        </Link>
        <nav className="menu" id="siteMenu">
          <Link href="/">Home</Link>
          <div className="cn-nav-dropdown">
            <Link href="/tools/" className="cn-nav-dropdown__trigger" aria-haspopup="true" id="cnToolsNavTrigger">
              Tools
            </Link>
            <div className="cn-nav-dropdown__panel" role="menu" aria-labelledby="cnToolsNavTrigger">
              <Link href="/tools/" className="cn-nav-dropdown__hub" role="menuitem">
                All calculators
              </Link>
              <NavGroup label="Housing" links={HOUSING_LINKS} />
              <NavGroup label="Loans & credit" links={LENDING_LINKS} />
              <NavGroup label="More calculators" links={OTHER_LINKS} />
            </div>
          </div>
          <Link href="/blog/">Blog</Link>
          <Link href="/about/">About</Link>
          <Link href="/contact/">Contact</Link>
        </nav>
      </div>
    </header>
  );
}
