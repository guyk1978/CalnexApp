import Link from "next/link";
import { BrandChartMark } from "@/components/layout/BrandChartMark";
import { SiteHeaderActions } from "@/components/layout/SiteHeaderActions";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container nav">
        <Link href="/" className="brand">
          CalnexApp
          <BrandChartMark />
        </Link>
        {/* CN_NAV_MENU_START */}
        <nav className="menu" id="siteMenu">
          <Link href="/" data-nav-link>
            Home
          </Link>
          <Link href="/tools/" data-nav-link>
            Tools
          </Link>
          <Link href="/blog/" data-nav-link>
            Blog
          </Link>
          <Link href="/about/" data-nav-link>
            About
          </Link>
          <Link href="/contact/" data-nav-link>
            Contact
          </Link>
        </nav>
        {/* CN_NAV_MENU_END */}
        <SiteHeaderActions />
      </div>
    </header>
  );
}
