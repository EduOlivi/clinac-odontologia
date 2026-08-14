import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // scripts/check-app.js é uma ferramenta CLI standalone (Node/CommonJS,
    // zero dependências) fora do bundle do app Next.js — não faz sentido
    // aplicar as regras de lint do app (ESM/TypeScript) a ela. Substituiu
    // scripts/check-site.js (que checava index.html/privacidade.html/
    // termos.html, arquivos que não existem mais desde a migração para
    // Next.js) — ver relatório de qa e README, seção "Como rodar as
    // verificações".
    "scripts/**",
    // Saída de build do adapter Cloudflare (gerada por `npm run
    // build:worker`/`npm run deploy`, nunca commitada — ver .gitignore e
    // docs/DEPLOY.md). É código gerado, não código deste repositório.
    ".open-next/**",
  ]),
]);

export default eslintConfig;
