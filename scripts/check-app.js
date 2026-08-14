#!/usr/bin/env node
/**
 * check-app.js — zero-dependency mechanical checks for the Clínac
 * Odontologia Next.js app, replacing the old scripts/check-site.js.
 *
 * Why this file replaces check-site.js instead of patching it: check-site.js
 * checked index.html/privacidade.html/termos.html directly with regex — none
 * of those files exist anymore after the Next.js migration (this is now a
 * React/TypeScript app with a real build). Most of what it protected against
 * is now caught for free by tools that didn't exist in the static-site setup:
 *
 *   - broken imports/routes/types           -> `npm run typecheck` (tsc)
 *   - unresolved local references            -> `npm run build` (Next)
 *   - missing/empty <img alt>                -> eslint-config-next bundles
 *                                                jsx-a11y/alt-text (kept here
 *                                                too, as a hard-fail backstop
 *                                                — that eslint rule is only
 *                                                "warn", so a broken alt text
 *                                                would NOT fail `npm run lint`
 *                                                on its own today)
 *   - the actual LGPD consent gate           -> app/lib/leads.test.ts +
 *                                                app/api/leads/route.test.ts
 *                                                (Vitest) test the SERVER
 *                                                enforcement, which is the
 *                                                one that actually matters;
 *                                                this script keeps a cheap
 *                                                source-level check that the
 *                                                client checkbox is still
 *                                                `required` too (defense in
 *                                                depth / fast UX signal)
 *
 * What's left, and not covered by tsc/eslint/vitest, is what this script
 * checks: source-level regressions that compile fine and don't fail a type
 * or lint rule, but would quietly break something a real visitor depends on.
 *
 * Run before every release (and see .github/workflows/ci.yml — it runs this
 * too):
 *   node scripts/check-app.js
 *
 * It does NOT replace the manual QA checklist in README.md, nor the
 * automated tests under app/**\/*.test.ts — it only catches mechanical
 * regressions that are cheap to introduce by accident and easy to check
 * without a browser.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

let failures = 0;

function fail(msg) {
  console.log("FAIL - " + msg);
  failures++;
}
function ok(msg) {
  console.log("OK   - " + msg);
}

function read(relPath) {
  const p = path.join(ROOT, relPath);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}

// ---------------------------------------------------------------------
// 1. Rotas/arquivos-chave existem (pega um rename/delete acidental que o
//    build ainda passaria se a rota apagada não fosse referenciada em
//    lugar nenhum do resto do app — Next não avisa sobre um arquivo que
//    deixou de existir, só sobre um import quebrado).
// ---------------------------------------------------------------------
const REQUIRED_FILES = [
  "app/page.tsx",
  "app/components/BookingForm.tsx",
  "app/api/leads/route.ts",
  "app/api/keepalive/route.ts",
  "app/api/backup-export/route.ts",
  "app/admin/page.tsx",
  "app/admin/login/page.tsx",
  "app/admin/leads/page.tsx",
  "app/privacidade/page.tsx",
  "app/termos/page.tsx",
  "middleware.ts",
  "supabase/migrations/20260814120000_leads.sql",
  ".env.example",
];

for (const relPath of REQUIRED_FILES) {
  if (fs.existsSync(path.join(ROOT, relPath))) {
    ok(`${relPath} existe`);
  } else {
    fail(`arquivo esperado não encontrado: ${relPath} — rota/arquivo crítico foi renomeado ou apagado?`);
  }
}

// ---------------------------------------------------------------------
// 2. Checkbox obrigatório de consentimento LGPD ainda tem `required`
//    (sinal rápido de UI — quem realmente barra é o servidor, testado em
//    app/lib/leads.test.ts e app/api/leads/route.test.ts, não aqui).
// ---------------------------------------------------------------------
{
  const src = read("app/components/BookingForm.tsx");
  if (src === null) {
    fail("app/components/BookingForm.tsx não encontrado — não foi possível checar o checkbox de consentimento");
  } else {
    const consentMatch = src.match(/<input[^>]*name="consentimento_lgpd"[^>]*\/?>/);
    if (!consentMatch) {
      fail("BookingForm.tsx: não encontrei o checkbox consentimento_lgpd — foi renomeado/removido?");
    } else if (!/\brequired\b/.test(consentMatch[0])) {
      fail(
        "BookingForm.tsx: o checkbox consentimento_lgpd perdeu o atributo `required` — isto é o portão de " +
          "consentimento de dado de saúde (LGPD art. 11) do lado do cliente. Tag encontrada: " +
          consentMatch[0],
      );
    } else {
      ok("BookingForm.tsx: checkbox consentimento_lgpd continua `required`");
    }

    const marketingMatch = src.match(/<input[^>]*name="consentimento_marketing"[^>]*\/?>/);
    if (marketingMatch && /\brequired\b/.test(marketingMatch[0])) {
      fail(
        "BookingForm.tsx: o checkbox consentimento_marketing ganhou `required` — ele precisa continuar " +
          "OPCIONAL (LGPD exige consentimentos de finalidades diferentes coletados separadamente).",
      );
    } else if (marketingMatch) {
      ok("BookingForm.tsx: checkbox consentimento_marketing continua opcional (sem required)");
    } else {
      fail("BookingForm.tsx: não encontrei o checkbox consentimento_marketing — foi renomeado/removido?");
    }
  }
}

// ---------------------------------------------------------------------
// 3. Toda <img> (não <Image>) em .tsx tem alt não vazio — backstop para
//    jsx-a11y/alt-text, que hoje está configurada como "warn" (não falha
//    `npm run lint`). Se um dia essa regra virar "error" no eslint config,
//    este bloco fica redundante e pode ser removido.
// ---------------------------------------------------------------------
{
  function walk(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        walk(full, out);
      } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".jsx"))) {
        out.push(full);
      }
    }
    return out;
  }

  const tsxFiles = walk(path.join(ROOT, "app"), []);
  let imgTagsChecked = 0;
  for (const file of tsxFiles) {
    const src = fs.readFileSync(file, "utf8");
    // Exige ao menos um espaço depois de "img" (ou seja, pelo menos um
    // atributo) para não confundir uma tag <img ...> real com a palavra
    // literal "<img>" aparecendo dentro de um comentário de código (ex.:
    // ImplantsSection.tsx explica em prosa por que usa <img> em vez de
    // next/image).
    const imgRe = /<img\s[^>]*>/g;
    let m;
    while ((m = imgRe.exec(src))) {
      imgTagsChecked++;
      const tag = m[0];
      const altMatch = tag.match(/\balt=(\{[^}]*\}|"[^"]*"|'[^']*')/);
      const isEmptyStringLiteral = altMatch && /^["']\s*["']$/.test(altMatch[1]);
      if (!altMatch || isEmptyStringLiteral) {
        fail(`${path.relative(ROOT, file)}: <img> sem alt (ou alt vazio): ${tag.slice(0, 100)}`);
      }
    }
  }
  if (imgTagsChecked > 0) ok(`${imgTagsChecked} tag(s) <img> encontradas em app/**/*.tsx, todas com alt`);
}

// ---------------------------------------------------------------------
// 4. Toda variável de ambiente lida por app/lib/env.ts está documentada em
//    .env.example — pega o caso de alguém adicionar uma env var nova no
//    código e esquecer de documentá-la (o próximo a rodar `npm run dev`
//    ou configurar produção não tem como adivinhar o nome certo).
// ---------------------------------------------------------------------
{
  const envSrc = read("app/lib/env.ts");
  const envExample = read(".env.example");
  if (!envSrc || !envExample) {
    fail("app/lib/env.ts ou .env.example não encontrado — não foi possível checar variáveis de ambiente");
  } else {
    const names = new Set();
    const re = /\b(?:required|optional)\("([A-Z0-9_]+)"\)/g;
    let m;
    while ((m = re.exec(envSrc))) names.add(m[1]);

    let missing = 0;
    for (const name of names) {
      const documented = new RegExp(`^${name}=`, "m").test(envExample);
      if (!documented) {
        fail(`.env.example não documenta a variável ${name}, lida por app/lib/env.ts`);
        missing++;
      }
    }
    if (missing === 0) {
      ok(`${names.size} variável(is) de ambiente lida(s) por app/lib/env.ts, todas documentadas em .env.example`);
    }
  }
}

console.log("\n=== SUMMARY ===");
console.log(`${failures} failure(s)`);
process.exit(failures ? 1 : 0);
