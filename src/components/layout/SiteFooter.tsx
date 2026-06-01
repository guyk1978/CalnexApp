const LEGAL_DISCLAIMER =
  "CalnexApp provides financial estimation tools for informational purposes only. We are not responsible for financial decisions made based on these calculations. Always consult a licensed financial advisor before making financial commitments.";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-content">
        <p>
          &copy; <span id="year" /> CalnexApp. All rights reserved.
        </p>
        <nav className="footer-links" aria-label="Footer">
          <a href="/about/">About</a>
          <a href="/contact/">Contact</a>
          <a href="/blog/">Blog</a>
          <a href="https://mapdiagram.com/" target="_blank" rel="noopener noreferrer">
            MapDiagram
          </a>
        </nav>
        <div className="cn-footer-partners" aria-label="Partner utilities">
          <span>Planning tools:</span>
          <a href="https://mapdiagram.com/" target="_blank" rel="noopener noreferrer">
            MapDiagram
          </a>
          <a href="https://joinmypdf.com/" target="_blank" rel="noopener noreferrer">
            JoinMyPDF
          </a>
        </div>
        <p className="legal-disclaimer">{LEGAL_DISCLAIMER}</p>
      </div>
    </footer>
  );
}
