import Link from "next/link";

export function SiteNav() {
  return (
    <header className="site-header">
      <div className="container nav">
        <Link href="/" className="brand">
          CalnexApp
        </Link>
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
      </div>
    </header>
  );
}
