/**
 * Calculator page sidebar extraction + dashboard layout (header / sidebar / workspace).
 */

const SIDEBAR_PATTERNS = [
  /<form\b[^>]*\bcn-calc-sidebar\b[^>]*>[\s\S]*?<\/form>/i,
  /<aside\b[^>]*\bcn-calc-global-sidebar\b[^>]*>[\s\S]*?<\/aside>/i,
  /<article\b[^>]*\bcn-calc-sidebar\b[^>]*>[\s\S]*?<\/article>/i,
  /<article\b[^>]*\bclass="card cn-calc-sidebar"[^>]*>[\s\S]*?<\/article>/i,
  /<form\b[^>]*\bcn-debt-payoff-layout__inputs\b[^>]*>[\s\S]*?<\/form>/i,
  /<form\b[^>]*\bcn-loan-compare-layout__inputs\b[^>]*>[\s\S]*?<\/form>/i,
  /<form\b[^>]*\binput-card\b[^>]*>[\s\S]*?<\/form>/i,
];

const WORKFLOW_START =
  /(<div class="cn-tool-shell[^"]*"[^>]*>|<section class="calculator-layout[^"]*"[^>]*>|<section class="cn-debt-payoff-layout[^"]*"[^>]*>|<section class="cn-loan-compare-layout[^"]*"[^>]*>)/i;

const HERO_MARKERS = [
  /<!-- CN_CALCULATOR_HERO_STACK_START -->/i,
  /<div class="cn-calculator-hero-stack/i,
  /<section class="[^"]*cn-tool-page-title/i,
];

function addClassToTagAttrs(attrs, className) {
  if (new RegExp(`\\b${className}\\b`).test(attrs)) return attrs;
  if (/class=/.test(attrs)) {
    return attrs.replace(/class=(["'])([^"']*)\1/, `class=$1$2 ${className}$1`);
  }
  return `${attrs} class="${className}"`;
}

function stripMainLayoutPadding(attrs) {
  return attrs
    .replace(/\bpt-10\b/g, "")
    .replace(/\bsm:pt-14\b/g, "")
    .replace(/\bpx-4\b/g, "")
    .replace(/\bsm:px-6\b/g, "")
    .replace(/\bmax-w-7xl\b/g, "")
    .replace(/\bmx-auto\b/g, "")
    .replace(/\bsection-space\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatMainOpenTag(attrs) {
  let cleaned = stripMainLayoutPadding(attrs).trim();
  if (!/\bclass=/.test(cleaned)) {
    cleaned = addClassToTagAttrs(cleaned, "cn-calc-page-frame");
  } else {
    cleaned = addClassToTagAttrs(` ${cleaned.replace(/^\s+/, "")}`, "cn-calc-page-frame");
  }
  if (!cleaned.startsWith(" ")) cleaned = ` ${cleaned}`;
  return `<main${cleaned}>`;
}

function stripMainPaddingClasses(html) {
  let next = html.replace(/<mainclass=/gi, '<main class=');
  next = next.replace(/<main\b([^>]*)>/i, (match, attrs) => formatMainOpenTag(attrs));
  return next;
}

function normalizeSidebarMarkup(sidebarHtml) {
  let next = sidebarHtml.trim();
  if (/^<article\b/i.test(next)) {
    next = next.replace(/^<article\b/i, "<aside").replace(/<\/article>\s*$/i, "</aside>");
  }

  next = next.replace(/\bclass="([^"]*)"/i, (match, cls) => {
    const parts = new Set(cls.split(/\s+/).filter((t) => t && t !== "card" && t !== "input-card"));
    parts.add("cn-calc-global-sidebar");
    parts.add("cn-calc-sidebar");
    return `class="${[...parts].join(" ")}"`;
  });

  if (!/aria-label=/i.test(next) && /^<form\b/i.test(next)) {
    next = next.replace(/^<form\b/i, '<form aria-label="Calculator inputs"');
  } else if (!/aria-label=/i.test(next) && /^<aside\b/i.test(next)) {
    next = next.replace(/^<aside\b/i, '<aside aria-label="Calculator inputs"');
  }

  return next;
}

function extractSidebar(html) {
  for (const pattern of SIDEBAR_PATTERNS) {
    const match = html.match(pattern);
    if (!match) continue;
    return {
      sidebar: match[0],
      remainder: html.replace(match[0], "\n"),
    };
  }
  return null;
}

function findWorkflowSplitIndex(inner) {
  const match = WORKFLOW_START.exec(inner);
  return match ? match.index : -1;
}

function extractHeroBlock(inner) {
  let earliest = inner.length;
  for (const marker of HERO_MARKERS) {
    const m = marker.exec(inner);
    if (m && m.index < earliest) earliest = m.index;
  }
  if (earliest >= inner.length) return { hero: "", workflowStart: 0, remainder: inner };

  const hero = inner.slice(earliest);
  const beforeHero = inner.slice(0, earliest).trim();
  const workflowIdx = findWorkflowSplitIndex(hero);
  if (workflowIdx < 0) return { hero, workflowStart: earliest, remainder: inner };

  return {
    hero: hero.slice(0, workflowIdx).trim(),
    workflowBlock: hero.slice(workflowIdx).trim(),
    beforeHero,
  };
}

function buildDashboardMain(mainAttrs, sidebar, workspaceContent) {
  const mainOpen = formatMainOpenTag(mainAttrs);
  return `${mainOpen}
      <div class="cn-calc-page-body cn-calc-dashboard__body">
        ${sidebar}
        <div class="cn-calc-page-main cn-calc-workspace">
${workspaceContent}
        </div>
      </div>
    </main>`;
}

function restructureCalculatorMain(html) {
  if (
    !html.includes("calculator-layout") &&
    !html.includes("cn-debt-payoff-layout") &&
    !html.includes("cn-loan-compare-layout")
  ) {
    return { html, changed: false };
  }
  if (html.includes("cn-calc-page-body")) return { html, changed: false };

  const mainMatch = html.match(/<main\b([^>]*)>([\s\S]*?)<\/main>/i);
  if (!mainMatch) return { html, changed: false };

  const mainAttrs = mainMatch[1];
  const mainInner = mainMatch[2];

  const splitIdx = findWorkflowSplitIndex(mainInner);
  if (splitIdx < 0) return { html, changed: false };

  const heroBlock = mainInner.slice(0, splitIdx).trim();
  const workflowBlock = mainInner.slice(splitIdx).trim();
  const extracted = extractSidebar(workflowBlock);
  if (!extracted) return { html, changed: false };

  const sidebar = normalizeSidebarMarkup(extracted.sidebar);
  const workspaceContent = [heroBlock, extracted.remainder.trim()].filter(Boolean).join("\n");
  const rebuilt = buildDashboardMain(mainAttrs, sidebar, workspaceContent);

  return { html: html.replace(mainMatch[0], rebuilt), changed: true };
}

/** Move cn-calc-page-full (title, nav) into cn-calc-workspace for already-patched pages. */
function migrateDashboardLayout(html) {
  const fullStart = html.indexOf('<div class="cn-calc-page-full">');
  const bodyStart = html.indexOf('<div class="cn-calc-page-body');
  if (fullStart < 0 || bodyStart < 0 || bodyStart <= fullStart) {
    return { html, changed: false };
  }

  const fullOpenLen = '<div class="cn-calc-page-full">'.length;
  let fullContent = html.slice(fullStart + fullOpenLen, bodyStart).trim();
  fullContent = fullContent.replace(/<\/div>\s*$/i, "").trim();

  let next = html.slice(0, fullStart) + html.slice(bodyStart);
  next = next.replace(
    /<div class="cn-calc-page-body([^"]*)">/i,
    '<div class="cn-calc-page-body cn-calc-dashboard__body$1">'
  );

  const mainOpen = next.match(/<div class="cn-calc-page-main([^"]*)">/i);
  if (!mainOpen) return { html, changed: false };

  next = next.replace(
    mainOpen[0],
    `${mainOpen[0]}\n${fullContent}\n`
  );

  return { html: next, changed: true };
}

function ensureWorkspaceClass(html) {
  if (html.includes("cn-calc-workspace")) return { html, changed: false };
  if (!html.includes("cn-calc-page-main")) return { html, changed: false };
  return {
    html: html.replace(
      /<div class="cn-calc-page-main([^"]*)">/gi,
      '<div class="cn-calc-page-main cn-calc-workspace$1">'
    ),
    changed: true,
  };
}

function ensureDashboardBodyClass(html) {
  if (html.includes("cn-calc-dashboard__body")) return { html, changed: false };
  if (!html.includes("cn-calc-page-body")) return { html, changed: false };
  return {
    html: html.replace(/class="cn-calc-page-body"/g, 'class="cn-calc-page-body cn-calc-dashboard__body"'),
    changed: true,
  };
}

function fixBrokenMainTags(html) {
  const next = html.replace(/<mainclass=/gi, "<main class=");
  return { html: next, changed: next !== html };
}

function applyDashboardLayout(html) {
  let next = html;
  let changed = false;

  const fix = fixBrokenMainTags(next);
  if (fix.changed) {
    next = fix.html;
    changed = true;
  }

  const steps = [
    restructureCalculatorMain,
    migrateDashboardLayout,
    ensureDashboardBodyClass,
    ensureWorkspaceClass,
    (h) => {
      const n = stripMainPaddingClasses(h);
      return { html: n, changed: n !== h };
    },
  ];
  for (const step of steps) {
    const result = step(next);
    if (result.changed) {
      next = result.html;
      changed = true;
    }
  }

  return { html: next, changed };
}

module.exports = {
  restructureCalculatorMain,
  migrateDashboardLayout,
  applyDashboardLayout,
  normalizeSidebarMarkup,
  extractSidebar,
};
