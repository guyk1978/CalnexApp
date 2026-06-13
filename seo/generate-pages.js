const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(__dirname, "data", "loan-pages.json");
const GENERATED_ROOT = path.join(ROOT, "tools", "loan-calculator");
const { renderLoanScenarioPage, loadAllEntries } = require("../scripts/loan-scenario-page.cjs");

const ensureDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true });

const run = () => {
  const entries = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")).slice(0, 50);
  const allEntries = loadAllEntries();
  let count = 0;

  entries.forEach((entry) => {
    const { html, data } = renderLoanScenarioPage(entry, { allEntries });
    const targetDir = path.join(GENERATED_ROOT, data.slug);
    ensureDir(targetDir);
    fs.writeFileSync(path.join(targetDir, "index.html"), html, "utf8");
    count += 1;
  });

  console.log(`Generated ${count} loan scenario pages under tools/loan-calculator/.`);
};

run();
