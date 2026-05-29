import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const file = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "tools", "index.html");
let html = fs.readFileSync(file, "utf8");
const start = html.indexOf("<!-- CN_TOOLS_HUB_GRID_START -->");
if (start === -1) throw new Error("CN_TOOLS_HUB_GRID_START missing");

let endIdx = html.indexOf("<!-- ILB_TOOLS_LATEST_END -->");
if (endIdx !== -1) {
  endIdx += "<!-- ILB_TOOLS_LATEST_END -->".length;
} else {
  endIdx = html.indexOf("<!-- CN_TOOLS_SCENARIOS_END -->");
  if (endIdx === -1) endIdx = html.indexOf("<!-- CN_TOOLS_HUB_GRID_END -->");
  if (endIdx === -1) throw new Error("end marker missing");
  endIdx += "<!-- CN_TOOLS_SCENARIOS_END -->".length || "<!-- CN_TOOLS_HUB_GRID_END -->".length;
}

const replacement = `      <!-- CN_TOOLS_HUB_GRID_START -->
      <!-- CN_TOOLS_HUB_GRID_END -->
`;

html = html.slice(0, start) + replacement + html.slice(endIdx);
fs.writeFileSync(file, html, "utf8");
console.log("reset-tools-index-markers: done");
