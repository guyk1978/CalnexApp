const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TRACKING_ID = "G-MMLPFGBR27";
const SNIPPET = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-MMLPFGBR27"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-MMLPFGBR27');
</script>`;

const walk = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile() && fullPath.toLowerCase().endsWith(".html")) {
      files.push(fullPath);
    }
  }
  return files;
};

const inject = (html) => {
  if (html.includes(TRACKING_ID)) return html;
  return html.replace("</head>", `    ${SNIPPET}\n  </head>`);
};

const run = () => {
  const htmlFiles = walk(ROOT);
  let updated = 0;
  for (const filePath of htmlFiles) {
    const current = fs.readFileSync(filePath, "utf8");
    const next = inject(current);
    if (next !== current) {
      fs.writeFileSync(filePath, next, "utf8");
      updated += 1;
    }
  }
  console.log(`GA injection complete. Updated ${updated} files.`);
};

run();
