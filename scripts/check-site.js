#!/usr/bin/env node
/**
 * check-site.js — zero-dependency static checks for the Clínac Odontologia site.
 *
 * Why this exists: the site is intentionally a zero-dependency static
 * project (no build step, no test framework, no CI). That's the right call
 * for a one-page marketing site — but a couple of failure modes are cheap to
 * catch mechanically and easy to introduce by accident while hand-editing
 * HTML (a renamed file, a typo'd href, a removed `required`, a missing alt
 * text). This script catches those without adding a single npm dependency:
 * it only uses Node's built-in fs/path, no puppeteer/jsdom/test framework.
 *
 * Run before every release:
 *   node scripts/check-site.js
 *
 * It does NOT replace the manual QA checklist (see PRIVACIDADE.md/README
 * for the release process) — it only catches the mechanical stuff:
 *   1. Every local href="..."/src="..." resolves to a real file.
 *   2. Every in-page href="#id" resolves to an element with that id.
 *   3. Every <img> has a non-empty alt attribute.
 *   4. The required LGPD consent checkbox still has the `required` attribute.
 *   5. Footer of each page links to the other two pages (cross-page nav
 *      check for privacidade.html / termos.html / index.html).
 *   6. Flags (warning, not failure) if FORMSPREE_ENDPOINT still has the
 *      YOUR_FORM_ID placeholder — the form silently no-ops in that state.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = ['index.html', 'privacidade.html', 'termos.html'];

let failures = 0;
let warnings = 0;

function fail(msg) {
  console.log('FAIL - ' + msg);
  failures++;
}
function warn(msg) {
  console.log('WARN - ' + msg);
  warnings++;
}
function ok(msg) {
  console.log('OK   - ' + msg);
}

function readPage(name) {
  const p = path.join(ROOT, name);
  if (!fs.existsSync(p)) {
    fail(`${name} does not exist at ${p}`);
    return null;
  }
  return fs.readFileSync(p, 'utf8');
}

const pageContents = {};
for (const page of PAGES) {
  const html = readPage(page);
  if (html) pageContents[page] = html;
}

// ---------------------------------------------------------------------
// 1 & 2. Local href/src resolve to real files or real in-page ids
// ---------------------------------------------------------------------
function extractAttrs(html, attr) {
  const re = new RegExp(attr + '="([^"]*)"', 'g');
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

function extractIds(html) {
  const re = /\sid="([^"]+)"/g;
  const out = new Set();
  let m;
  while ((m = re.exec(html))) out.add(m[1]);
  return out;
}

for (const page of PAGES) {
  const html = pageContents[page];
  if (!html) continue;
  const ids = extractIds(html);
  const refs = [...extractAttrs(html, 'href'), ...extractAttrs(html, 'src')];

  for (const ref of refs) {
    if (!ref || ref.startsWith('http://') || ref.startsWith('https://') ||
        ref.startsWith('mailto:') || ref.startsWith('tel:') || ref === '#') {
      continue; // external / non-file references out of scope for this check
    }
    if (ref.startsWith('#')) {
      const id = ref.slice(1);
      if (!ids.has(id)) {
        fail(`${page}: in-page link "${ref}" has no matching id="${id}" on the page`);
      }
      continue;
    }
    // file-relative reference (e.g. "privacidade.html", "imagens/foto 1.jpeg")
    const [filePart] = ref.split('#');
    const resolved = path.join(ROOT, decodeURIComponent(filePart));
    if (!fs.existsSync(resolved)) {
      fail(`${page}: reference "${ref}" does not resolve to an existing file (looked for ${resolved})`);
    }
  }
}
if (failures === 0) ok('All local href/src references resolve to real files or in-page ids');

// ---------------------------------------------------------------------
// 3. Every <img> has non-empty alt text
// ---------------------------------------------------------------------
for (const page of PAGES) {
  const html = pageContents[page];
  if (!html) continue;
  const imgRe = /<img\b[^>]*>/g;
  let m;
  let imgCount = 0;
  while ((m = imgRe.exec(html))) {
    imgCount++;
    const tag = m[0];
    const altMatch = tag.match(/alt="([^"]*)"/);
    if (!altMatch || altMatch[1].trim() === '') {
      fail(`${page}: <img> tag missing non-empty alt text: ${tag.slice(0, 80)}...`);
    }
  }
  if (imgCount > 0) ok(`${page}: ${imgCount} <img> tag(s) all have non-empty alt text`);
}

// ---------------------------------------------------------------------
// 4. Required LGPD consent checkbox still has `required`
// ---------------------------------------------------------------------
{
  const html = pageContents['index.html'];
  if (html) {
    const consentMatch = html.match(/<input[^>]*name="consentimento_lgpd"[^>]*>/);
    if (!consentMatch) {
      fail('index.html: could not find the consentimento_lgpd checkbox at all — did the field get renamed/removed?');
    } else if (!/\brequired\b/.test(consentMatch[0])) {
      fail('index.html: consentimento_lgpd checkbox is missing the `required` attribute — this is the LGPD consent gate and MUST block submission when unchecked. Tag found: ' + consentMatch[0]);
    } else {
      ok('index.html: consentimento_lgpd checkbox has the required attribute');
    }

    const marketingMatch = html.match(/<input[^>]*name="consentimento_marketing"[^>]*>/);
    if (marketingMatch && /\brequired\b/.test(marketingMatch[0])) {
      fail('index.html: consentimento_marketing checkbox has `required` — this is supposed to be OPTIONAL. If this is intentional, update this check.');
    } else if (marketingMatch) {
      ok('index.html: consentimento_marketing checkbox is correctly optional (no required attribute)');
    } else {
      warn('index.html: could not find the consentimento_marketing checkbox');
    }
  }
}

// ---------------------------------------------------------------------
// 5. Footer cross-links between the three pages
// ---------------------------------------------------------------------
{
  const expectations = {
    'index.html': ['privacidade.html', 'termos.html'],
    'privacidade.html': ['termos.html', 'index.html'],
    'termos.html': ['privacidade.html', 'index.html'],
  };
  for (const [page, targets] of Object.entries(expectations)) {
    const html = pageContents[page];
    if (!html) continue;
    for (const target of targets) {
      if (!html.includes(`href="${target}"`)) {
        fail(`${page}: expected a link to "${target}" (reachability between legal pages / footer) but none was found`);
      }
    }
  }
  ok('Cross-page links between index.html / privacidade.html / termos.html verified');
}

// ---------------------------------------------------------------------
// 6. FORMSPREE_ENDPOINT placeholder (warning only — already tracked
//    extensively in code comments as a pre-launch blocker, not a bug)
// ---------------------------------------------------------------------
{
  const html = pageContents['index.html'];
  if (html && html.includes('YOUR_FORM_ID')) {
    warn('index.html: FORMSPREE_ENDPOINT still has the YOUR_FORM_ID placeholder — the booking form will NOT send anywhere until this is replaced with a real Formspree form ID before launch.');
  }
}

console.log('\n=== SUMMARY ===');
console.log(`${failures} failure(s), ${warnings} warning(s)`);
process.exit(failures ? 1 : 0);
