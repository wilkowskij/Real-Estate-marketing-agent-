// Convert a Markdown doc into a branded, self-contained HTML file that's easy
// to share (opens in any browser, prints cleanly to PDF). No external assets.
//
//   node scripts/build-doc-html.mjs docs/TEST_PLAN.md docs/TEST_PLAN.html "Marquee — Product Test Plan"

import { readFileSync, writeFileSync } from "node:fs";
import { marked } from "marked";

const [, , inPath, outPath, titleArg] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage: node scripts/build-doc-html.mjs <in.md> <out.html> [title]");
  process.exit(1);
}

const md = readFileSync(inPath, "utf8");
const title = titleArg || "Marquee";
const body = marked.parse(md, { mangle: false, headerIds: true });

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  :root {
    --navy: #1b2a4a; --gold: #b88a2e; --gold-deep: #8a6420;
    --ink: #1f2433; --ink-soft: #3c4359; --ink-muted: #6b7280;
    --paper: #faf7f0; --line: #e7e1d4; --card: #ffffff;
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0; background: var(--paper); color: var(--ink);
    font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .wrap { max-width: 880px; margin: 0 auto; padding: 48px 28px 80px; }
  .brand { font-weight: 800; font-size: 28px; color: var(--navy); letter-spacing: -0.01em; }
  .brand .dot { color: var(--gold); }
  .sub { color: var(--ink-muted); margin: 4px 0 28px; }
  h1, h2, h3 { color: var(--navy); line-height: 1.25; }
  h1 { font-size: 30px; margin: 36px 0 8px; }
  h2 { font-size: 23px; margin: 40px 0 10px; padding-top: 14px; border-top: 1px solid var(--line); }
  h3 { font-size: 18px; margin: 24px 0 8px; }
  p { margin: 10px 0; }
  a { color: var(--gold-deep); }
  code { background: #f1ece1; padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }
  hr { border: 0; border-top: 1px solid var(--line); margin: 28px 0; }
  ul { padding-left: 22px; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 14.5px; }
  th, td { border: 1px solid var(--line); padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: var(--navy); color: var(--paper); font-weight: 600; }
  tbody tr:nth-child(even) { background: #fcfaf4; }
  /* Make the rightmost "P/F" column a clear checkbox cell */
  td:last-child { min-width: 64px; text-align: center; }
  blockquote { margin: 14px 0; padding: 10px 16px; background: #fff8e8; border-left: 3px solid var(--gold); color: var(--ink-soft); }
  .print-hint { margin-top: 10px; }
  .print-hint button {
    font: inherit; cursor: pointer; border: 1px solid var(--line); background: var(--card);
    color: var(--navy); padding: 8px 14px; border-radius: 999px;
  }
  @media print {
    body { background: #fff; }
    .wrap { padding: 0; max-width: none; }
    .print-hint { display: none; }
    h2 { break-before: auto; }
    tr, table, blockquote { break-inside: avoid; }
    th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="brand">Marquee<span class="dot">.</span></div>
    <p class="sub">Real Estate Marketing Studio — NJ / Monmouth County</p>
    <div class="print-hint"><button onclick="window.print()">🖨 Print / Save as PDF</button></div>
    ${body}
  </div>
</body>
</html>`;

writeFileSync(outPath, html, "utf8");
console.log(`Wrote ${outPath} (${(html.length / 1024).toFixed(1)} KB)`);
