# CLAUDE.md

Este arquivo é só um ponteiro para um agente de IA trabalhando neste repo. A explicação completa do projeto está em [`README.md`](README.md) (o que é, como rodar, pendências de lançamento) e em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) / [`docs/DEPLOY.md`](docs/DEPLOY.md) (decisões técnicas, RLS, LGPD, pipeline de deploy). Leia os três antes de editar o app — não repita aqui o que já está lá.

## Específico deste repo para trabalho agêntico

- **Stack real: Next.js 16 (App Router, TypeScript) + Supabase, deployado no Cloudflare Workers via `@opennextjs/cloudflare`.** Não é mais um site estático — há build (`npm run build`), testes (`npm test`) e um backend de verdade (`app/api/`, `app/admin/`, RLS no Postgres). Não há aviso por e-mail: a confirmação de novo pedido é só pelo WhatsApp (decisão da clínica, 2026-08-20 — ver changelog de `CURRENT_POLICY_VERSION` em `app/lib/leads.ts`). Não reintroduza um provedor de e-mail transacional (Resend ou outro) sem esse pedido vir do usuário de novo.
- **Salve arquivos `.md`/`.tsx`/`.ts` como UTF-8 sem BOM.** O `README.md` já chegou corrompido (mojibake/null bytes) uma vez neste repo por um save incorreto — confira a codificação antes de commitar se usar uma ferramenta que não seja um editor de texto padrão.
- **Não edite o conteúdo jurídico** de `app/privacidade/page.tsx`, `app/termos/page.tsx`, `PRIVACIDADE.md` ou `TERMOS.md` além de manter os dois formatos sincronizados quando um mudar — são minutas explicitamente marcadas como pendentes de revisão por advogado; preencher os campos `[PREENCHER]` com valores plausíveis não é uma tarefa para IA resolver sozinha. O texto de consentimento em `BookingForm.tsx` também carrega requisito legal específico — não parafrasear/encurtar sem revisão de compliance (ver comentário no próprio arquivo).
- **Mudou a substância de `PRIVACIDADE.md`?** Bumpe `CURRENT_POLICY_VERSION` em `app/lib/leads.ts` **no mesmo commit**, e atualize o `value` do input oculto `politica_versao` em `BookingForm.tsx` para o mesmo texto. Sem isso, o rastro de consentimento de quem já enviou o formulário aponta para um texto que a pessoa nunca viu.
- **Nunca use `service_role` fora de `app/api/leads`, `app/api/keepalive` e `app/api/backup-export`.** Essa chave ignora Row Level Security — é acesso root ao banco. O painel `/admin` lê os dados pela sessão do usuário (`app/lib/supabase/server.ts`), de propósito: é a RLS no Postgres que decide quem vê o quê, não um `if` no TypeScript. Não "simplifique" isso trocando por `service_role` — é a decisão arquitetural mais importante do projeto (ver `docs/ARQUITETURA.md`).
- **Não renomeie `middleware.ts` para `proxy.ts`** (nem rode `@next/codemod middleware-to-proxy`) sem antes conferir se `@opennextjs/cloudflare` passou a suportar middleware em runtime Node.js — hoje não suporta, e o build do Worker quebra. Ver comentário no topo do próprio arquivo e `docs/DEPLOY.md`.
- Depois de qualquer mudança em `app/lib/leads.ts`, `app/api/leads/route.ts`, `app/components/BookingForm.tsx` ou na migração RLS (`supabase/migrations/`), rode `npm run typecheck && npm run lint && npm run test && npm run check` antes de considerar a tarefa concluída — são os quatro comandos do job `verify` do CI. Se a mudança tocar RLS/policies, rode também `supabase/tests/rls_leads.test.sql` manualmente (não está em CI — exige Postgres real, ver instruções no topo do arquivo).
- **Nenhum agente de IA consegue completar os passos que exigem login em conta real** (criar o projeto Supabase, criar o widget Turnstile, cadastrar secrets na Cloudflare) — ver a checklist "Pendências antes do lançamento" no `README.md`. Não simule/invente esses passos como concluídos.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
