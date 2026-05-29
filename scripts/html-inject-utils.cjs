/**
 * Marker-delimited HTML injection — full replace between START/END comments.
 * Never append; always clear inner content before writing.
 */

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Remove duplicate START…END regions (keeps the first pair only). */
function dedupeMarkerRegions(html, startMarker, endMarker) {
  let result = html;
  const first = result.indexOf(startMarker);
  if (first === -1) return result;

  let next = result.indexOf(startMarker, first + startMarker.length);
  while (next !== -1) {
    const endIdx = result.indexOf(endMarker, next);
    if (endIdx === -1) break;
    result = result.slice(0, next) + result.slice(endIdx + endMarker.length);
    next = result.indexOf(startMarker, first + startMarker.length);
  }
  return result;
}

function findMarkerPair(html, startMarker, endMarker, scopeEnd = html.length) {
  const scoped = html.slice(0, scopeEnd);
  const startIdx = scoped.indexOf(startMarker);
  if (startIdx === -1) return null;
  const endIdx = scoped.indexOf(endMarker, startIdx + startMarker.length);
  if (endIdx === -1) return null;
  return { startIdx, endIdx };
}

/**
 * Replace everything from startMarker through endMarker (inclusive) with
 * startMarker + innerHtml + endMarker.
 */
function replaceMarkerBlock(html, startMarker, endMarker, innerHtml, options = {}) {
  const { scopeBefore = "</main>" } = options;
  if (!html.includes(startMarker)) return null;

  html = dedupeMarkerRegions(html, startMarker, endMarker);

  const scopeIdx = scopeBefore ? html.indexOf(scopeBefore) : -1;
  const scopeEnd = scopeIdx === -1 ? html.length : scopeIdx;
  const pair = findMarkerPair(html, startMarker, endMarker, scopeEnd);
  if (!pair) return null;

  const inner = innerHtml ?? "";
  const replacement = `${startMarker}\n${inner}\n${endMarker}`;
  return html.slice(0, pair.startIdx) + replacement + html.slice(pair.endIdx + endMarker.length);
}

/** Regex variant matching the user's spec (non-greedy, first END after START). */
function replaceMarkerBlockRegex(html, startMarker, endMarker, innerHtml) {
  html = dedupeMarkerRegions(html, startMarker, endMarker);
  const regex = new RegExp(
    `${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`
  );
  if (!regex.test(html)) return null;
  const inner = innerHtml ?? "";
  return html.replace(regex, `${startMarker}\n${inner}\n${endMarker}`);
}

/** Inject a full block (including both marker comments). */
function injectMarkerBlock(html, startMarker, endMarker, fullBlock, options = {}) {
  const { scopeBefore = "</main>" } = options;
  if (!html.includes(startMarker)) return null;

  html = dedupeMarkerRegions(html, startMarker, endMarker);

  const scopeIdx = scopeBefore ? html.indexOf(scopeBefore) : -1;
  const scopeEnd = scopeIdx === -1 ? html.length : scopeIdx;
  const pair = findMarkerPair(html, startMarker, endMarker, scopeEnd);
  if (!pair) return null;

  return html.slice(0, pair.startIdx) + fullBlock + html.slice(pair.endIdx + endMarker.length);
}

/** Remove stray cards between endMarker and the parent grid's closing </div>. */
function pruneOrphansAfterMarker(html, endMarker) {
  const endIdx = html.indexOf(endMarker);
  if (endIdx === -1) return html;
  const afterEnd = endIdx + endMarker.length;
  const tail = html.slice(afterEnd);
  const closeMatch = /<\/div>(\s*\n\s*<\/section>|\s*<\/section>)/i.exec(tail);
  if (!closeMatch) return html;
  const orphanZone = tail.slice(0, closeMatch.index).trim();
  if (!orphanZone || orphanZone.startsWith("<!--")) return html;
  return html.slice(0, afterEnd) + "\n          " + html.slice(afterEnd + closeMatch.index);
}

/** Reset a grid div to empty marker shell. */
function resetGridDivMarkers(html, divId, startMarker, endMarker) {
  if (html.includes(startMarker) && html.includes(endMarker)) {
    const cleared = replaceMarkerBlock(html, startMarker, endMarker, "");
    if (cleared) return cleared;
  }

  const divOpenRe = new RegExp(`<div id="${escapeRegExp(divId)}"[^>]*>`, "i");
  const openMatch = divOpenRe.exec(html);
  if (!openMatch) return html;

  const contentStart = openMatch.index + openMatch[0].length;
  const sectionIdx = html.indexOf("</section>", contentStart);
  if (sectionIdx === -1) return html;
  const divCloseIdx = html.lastIndexOf("</div>", sectionIdx);
  if (divCloseIdx === -1 || divCloseIdx < contentStart) return html;

  return (
    html.slice(0, contentStart) +
    `\n${startMarker}\n${endMarker}\n          ` +
    html.slice(divCloseIdx)
  );
}

function clearMarkerBlock(html, startMarker, endMarker, options = {}) {
  return replaceMarkerBlock(html, startMarker, endMarker, "", options);
}

const replaceBetweenMarkers = replaceMarkerBlock;
const replaceMarkedRegion = injectMarkerBlock;

module.exports = {
  escapeRegExp,
  dedupeMarkerRegions,
  findMarkerPair,
  replaceMarkerBlock,
  replaceMarkerBlockRegex,
  injectMarkerBlock,
  resetGridDivMarkers,
  clearMarkerBlock,
  pruneOrphansAfterMarker,
  replaceBetweenMarkers,
  replaceMarkedRegion
};
