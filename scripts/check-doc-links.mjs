#!/usr/bin/env node
// Checks every docs.tryterra.co URL cited in skills/** against the live docs.
// GitBook serves HTTP 200 with a "# Page Not Found" markdown body for missing
// pages, so the check fetches the .md variant of each page and inspects the
// body instead of trusting the status code.
//
// Status goes to stderr; failures are listed on stdout. Exits 1 on any broken
// link or unrecoverable network error.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SKILLS_DIR = join(ROOT, "skills");
const URL_RE = /https:\/\/docs\.tryterra\.co\/[^\s)"'\]`>]+/g;
const CONCURRENCY = 8;
const RETRIES = 2;

// URLs that are not doc pages (or are checked differently).
const SKIP = [
  /~gitbook\/mcp/, // MCP server endpoint, not a page
];

// Doc spaces that exist in the gitbook source but are not published yet.
// Broken links under these prefixes are warnings, not failures. Remove an
// entry once its space goes live so drift is caught again.
const KNOWN_UNPUBLISHED = [
  "https://docs.tryterra.co/routes-api-pre-release/", // Routes API (pre-release)
  // Vantage pages added by tryterra/gitbook-vantage-docs#1 - remove these
  // entries once that PR merges and the pages publish.
  "https://docs.tryterra.co/vantage-api-docs/core-concepts",
  "https://docs.tryterra.co/vantage-api-docs/getting-started/working-with-sandbox",
  "https://docs.tryterra.co/vantage-api-docs/documentation/managing-orders",
  "https://docs.tryterra.co/vantage-api-docs/documentation/errors",
  "https://docs.tryterra.co/vantage-api-docs/documentation/monitoring",
  "https://docs.tryterra.co/vantage-api-docs/documentation/best-practices",
  "https://docs.tryterra.co/vantage-api-docs/important-information/going-to-production",
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(md|json)$/.test(name)) yield p;
  }
}

// url -> Set of files citing it
const cites = new Map();
for (const file of walk(SKILLS_DIR)) {
  const text = readFileSync(file, "utf8");
  for (let url of text.match(URL_RE) ?? []) {
    url = url.replace(/[.,;:]+$/, "").replace(/#.*$/, "");
    if (SKIP.some((re) => re.test(url))) continue;
    if (!cites.has(url)) cites.set(url, new Set());
    cites.get(url).add(file.slice(ROOT.length));
  }
}

async function fetchBody(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      return { status: res.status, body: (await res.text()).slice(0, 2000) };
    } catch (err) {
      if (attempt >= RETRIES) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

async function check(url) {
  const target =
    url.endsWith(".md") || url.endsWith(".txt") ? url : `${url}.md`;
  const { status, body } = await fetchBody(target);
  if (status !== 200) return `HTTP ${status}`;
  if (body.includes("# Page Not Found"))
    return "page not found (GitBook 200 with not-found body)";
  return null;
}

const urls = [...cites.keys()].sort();
console.error(`Checking ${urls.length} unique docs.tryterra.co URLs...`);

const failures = [];
let cursor = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      let problem;
      try {
        problem = await check(url);
      } catch (err) {
        problem = `fetch failed: ${err.message}`;
      }
      if (problem) failures.push({ url, problem });
      else console.error(`  ok ${url}`);
    }
  }),
);

failures.sort((a, b) => a.url.localeCompare(b.url));
const warnings = failures.filter((f) =>
  KNOWN_UNPUBLISHED.some((p) => f.url.startsWith(p)),
);
const errors = failures.filter((f) => !warnings.includes(f));

for (const { url, problem } of warnings) {
  console.log(`WARN ${url} (${problem}; space listed as not yet published)`);
}
for (const { url, problem } of errors) {
  console.log(`BROKEN ${url} (${problem})`);
  for (const file of cites.get(url)) console.log(`  cited in ${file}`);
}
if (errors.length) {
  console.error(`\n${errors.length} broken link(s).`);
  process.exit(1);
}
console.error(
  warnings.length
    ? `All links OK (${warnings.length} unpublished-space warning(s)).`
    : "All links OK.",
);
