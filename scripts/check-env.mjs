#!/usr/bin/env node
// Fails CI when code reads an environment variable that .env.example does not declare.
// Undeclared variables are the most common way a fresh clone, a new teammate, or an agent
// ends up with a broken app, or worse, pastes a real secret somewhere to "fix" it.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const EXAMPLE_PATH = join(ROOT, ".env.example");
const STRICT = process.argv.includes("--strict");

// Build output and dependencies contain other people's env reads; scanning them
// produces false positives and makes the check too slow to run on every commit.
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", ".nuxt", ".svelte-kit", ".turbo", ".vercel",
  "dist", "build", "out", "coverage", "__pycache__", ".venv", "venv", ".mypy_cache",
  // This repo's ops-agents/ is a standalone service with its own .env.example
  // and its own env surface; scanning it against the root file would produce
  // false positives in both directions. It is checked separately, by hand,
  // until it gets its own check-env invocation.
  "ops-agents",
]);

const SOURCE_EXTS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte", ".py"]);

// Platform and framework variables are injected by the runtime, not configured by the
// project, so requiring them in .env.example would teach people to ignore the check.
const RUNTIME_PROVIDED = new Set([
  "NODE_ENV", "CI", "PORT", "HOME", "PATH", "PWD", "TZ",
  "VERCEL", "VERCEL_ENV", "VERCEL_URL", "VERCEL_GIT_COMMIT_SHA",
  "MODE", "DEV", "PROD", "SSR", "BASE_URL",
  "GITHUB_ACTIONS", "GITHUB_SHA", "GITHUB_REF",
]);

// This project reads the five Stripe price IDs dynamically (lib/billing/plans.ts
// resolves the value via a bracket lookup keyed by a variable, not a literal dotted
// reference). The static scan below cannot see those reads, so they are allowlisted
// here rather than left to false-positive as "missing".
// If a plan is added or renamed in lib/billing/plans.ts, its priceEnv/seatPriceEnv
// name must be added here too.
const DYNAMIC_ENV_READS = new Set([
  "STRIPE_PRICE_SOLO",
  "STRIPE_PRICE_TEAM",
  "STRIPE_PRICE_BROKERAGE",
  "STRIPE_PRICE_TEAM_SEAT",
  "STRIPE_PRICE_BROKERAGE_SEAT",
]);

// Only literal names can be checked statically. Dynamic access such as process.env[name]
// is invisible here, which is one more reason to keep env reads in one config module.
const PATTERNS = [
  /process\.env\.([A-Z][A-Z0-9_]*)/g,
  /process\.env\[\s*["'`]([A-Z][A-Z0-9_]*)["'`]\s*\]/g,
  /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g,
  /os\.environ\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/g,
  /os\.environ\.get\(\s*["']([A-Z][A-Z0-9_]*)["']/g,
  /os\.getenv\(\s*["']([A-Z][A-Z0-9_]*)["']/g,
];

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    // An unreadable directory should not hide the rest of the results.
    console.warn(`warn: skipped unreadable directory ${relative(ROOT, dir) || "."}: ${err.code || err.message}`);
    return files;
  }
  for (const entry of entries) {
    // Symlinks are skipped deliberately; following them can loop or scan outside the repo.
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name), files);
    } else if (entry.isFile() && SOURCE_EXTS.has(extname(entry.name))) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

function parseExample(path) {
  const declared = new Set();
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) declared.add(match[1]);
  }
  return declared;
}

function collectUsage(files) {
  const used = new Map(); // name -> first file it appeared in, for a useful error message
  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch (err) {
      console.warn(`warn: skipped unreadable file ${relative(ROOT, file)}: ${err.code || err.message}`);
      continue;
    }
    for (const pattern of PATTERNS) {
      pattern.lastIndex = 0; // global regexes keep state between calls
      let m;
      while ((m = pattern.exec(text)) !== null) {
        if (!used.has(m[1])) used.set(m[1], relative(ROOT, file));
      }
    }
  }
  return used;
}

function main() {
  if (!existsSync(EXAMPLE_PATH)) {
    console.error("error: .env.example not found at repository root. It is a Tier 1 file.");
    process.exit(2);
  }

  let declared;
  try {
    declared = parseExample(EXAMPLE_PATH);
  } catch (err) {
    console.error(`error: could not read .env.example: ${err.message}`);
    process.exit(2);
  }

  const used = collectUsage(walk(ROOT));
  for (const name of DYNAMIC_ENV_READS) {
    if (!used.has(name)) used.set(name, "lib/billing/plans.ts (dynamic process.env[...] read)");
  }

  const missing = [...used.entries()]
    .filter(([name]) => !declared.has(name) && !RUNTIME_PROVIDED.has(name))
    .sort(([a], [b]) => a.localeCompare(b));

  const unused = [...declared]
    .filter((name) => !used.has(name))
    .sort();

  if (missing.length) {
    console.error("Variables used in code but missing from .env.example:");
    for (const [name, file] of missing) console.error(`  ${name}  (first seen in ${file})`);
  }

  if (unused.length) {
    // Unused entries are a warning by default because some are consumed by tooling
    // (ORMs, CLIs, hosting) rather than by source code this script can see.
    const log = STRICT ? console.error : console.warn;
    log(`${STRICT ? "error" : "warn"}: declared in .env.example but not found in source:`);
    for (const name of unused) log(`  ${name}`);
  }

  if (missing.length || (STRICT && unused.length)) process.exit(1);
  console.log(`env check passed: ${declared.size} declared, ${used.size} referenced in source.`);
}

try {
  main();
} catch (err) {
  // Anything unexpected should fail loudly rather than let CI pass on a broken check.
  console.error(`error: env check crashed: ${err.stack || err.message}`);
  process.exit(2);
}
