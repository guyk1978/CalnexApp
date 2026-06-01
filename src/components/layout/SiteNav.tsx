import Link from "next/link";
import { getNavToolsByGroup } from "@/lib/nav-tools";

const GROUP_ACCENT: Record<string, string> = {
  housing: "housing",
  lending: "lending",
  auto: "auto",
  growth: "growth",
  planning: "planning",
};

function NavToolLink({ tool }: { tool: { name: string; path: string; navGroup: string } }) {
  const accent = GROUP_ACCENT[tool.navGroup] ?? "lending";
  return (
    <Link
      href={tool.path}
      className="cn-nav-dropdown__link cn-nav-dropdown__link--icon"
      role="menuitem"
    >
      <span className={`cn-nav-tool-icon cn-nav-tool-icon--${accent}`} aria-hidden="true">
        <svg
          className="cn-theme-icon"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      </span>
      <span>{tool.name}</span>
    </Link>
  );
}

export function SiteNav() {
  const groups = getNavToolsByGroup();

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
          <div className="cn-nav-dropdown">
            <Link
              href="/tools/"
              className="cn-nav-dropdown__trigger"
              data-nav-link
              aria-haspopup="true"
              aria-expanded="false"
              id="cnToolsNavTrigger"
            >
              Tools
            </Link>
            <div className="cn-nav-dropdown__panel" role="menu" aria-labelledby="cnToolsNavTrigger">
              <Link href="/tools/" className="cn-nav-dropdown__hub" role="menuitem">
                All calculators
              </Link>
              <div className="cn-nav-dropdown__scroll">
                {groups.map((group) => (
                  <div key={group.key} className="cn-nav-dropdown__group">
                    <p className="cn-nav-dropdown__label">{group.label}</p>
                    <div className="cn-nav-dropdown__grid">
                      {group.tools.map((tool) => (
                        <NavToolLink key={tool.path} tool={tool} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
