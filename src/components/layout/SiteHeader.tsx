import Link from "next/link";
import { BrandChartMark } from "@/components/layout/BrandChartMark";
import { SiteHeaderActions } from "@/components/layout/SiteHeaderActions";
import { getNavToolsByGroup } from "@/lib/nav-tools";
import {
  formatScenarioLabel,
  LOAN_SCENARIOS,
  loanScenarioPath,
} from "@/lib/loan-scenarios";
import { ToolIcon, iconForNavGroup } from "@/lib/tool-icons";

function NavToolLink({ tool }: { tool: { name: string; path: string; navGroup: string } }) {
  const accent = tool.navGroup;
  const icon = iconForNavGroup(tool.navGroup);
  return (
    <Link
      href={tool.path}
      className="cn-nav-dropdown__link cn-nav-dropdown__link--icon"
      role="menuitem"
    >
      <span className={`cn-nav-tool-icon cn-nav-tool-icon--${accent}`} aria-hidden="true">
        <ToolIcon name={icon} size={14} />
      </span>
      <span>{tool.name}</span>
    </Link>
  );
}

export function SiteHeader() {
  const groups = getNavToolsByGroup();

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
                {LOAN_SCENARIOS.length > 0 ? (
                  <div className="cn-nav-dropdown__group cn-nav-dropdown__group--scenarios">
                    <p className="cn-nav-dropdown__label">
                      Loan scenarios ({LOAN_SCENARIOS.length})
                    </p>
                    <div className="cn-nav-dropdown__grid cn-nav-dropdown__grid--scenarios">
                      {LOAN_SCENARIOS.map((entry) => (
                        <Link
                          key={loanScenarioPath(entry)}
                          href={loanScenarioPath(entry)}
                          className="cn-nav-dropdown__link cn-nav-dropdown__link--scenario"
                          role="menuitem"
                        >
                          {formatScenarioLabel(entry)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
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
        {/* CN_NAV_MENU_END */}
        <SiteHeaderActions />
      </div>
    </header>
  );
}
