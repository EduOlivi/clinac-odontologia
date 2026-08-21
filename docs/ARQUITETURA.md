# Arquitetura — Clínac Odontologia

Este documento explica **como** o sistema funciona por dentro e **por quê** foi construído assim — para quem for mexer no projeto sem ter acompanhado as decisões, com ou sem ajuda de IA. Para o que o projeto é e como rodá-lo, veja o [`README.md`](../README.md). Para o pipeline de deploy, secrets, cron e backup, veja [`docs/DEPLOY.md`](DEPLOY.md).

O projeto é uma aplicação Next.js pequena e deliberadamente enxuta — não há microsserviços, fila de mensagens ou camada de cache própria. A complexidade real está concentrada em três lugares: quem pode ler/escrever o quê no banco (autorização), como o sistema se protege de abuso automatizado sem custar dinheiro, e como cada peça se comporta na ausência de configuração (negar por padrão, em todo canto).

---

## Visão geral

```
Navegador do usuário
  │
  ├── GET /  (e demais rotas estáticas do site institucional)
  │     servido direto pela borda da Cloudflare quando possível — não invoca
  │     o Worker para HTML/CSS/imagem pré-renderizados (ver "assets" em
  │     wrangler.jsonc)
  │
  ├── POST /api/leads  (formulário de agendamento, app/components/BookingForm.tsx)
  │     └─ Next.js rodando em Cloudflare Workers (via OpenNext)
  │           ├─ Cloudflare Turnstile (siteverify) ── confirma que é humano
  │           └─ Supabase (Postgres, chave service_role) ── grava o lead
  │     (sucesso mostra o botão "Confirmar pelo WhatsApp" — link wa.me,
  │      sem chamada de servidor nenhuma, é o visitante quem decide enviar)
  │
  └── /admin/*  (painel da equipe)
        └─ Next.js (Server Components + Server Actions)
              └─ Supabase (Postgres, chave anon + sessão do usuário) ── lê/escreve
                 leads, decisão de acesso é da RLS do Postgres, não do TypeScript

Cloudflare Cron Triggers (fora do navegador, ver wrangler.jsonc)
  ├── diário   → GET /api/keepalive       → Supabase (evita pausa por inatividade)
  └── semanal  → GET /api/backup-export   → Supabase (lê tudo) + Cloudflare R2 (grava dump)
```

Stack completa e por que cada peça foi escolhida: ver a tabela "Tecnologias" no [`README.md`](../README.md). O ponto que este documento aprofunda é *como as peças se encaixam*, não a lista delas.

---

## Modelo de dados

Duas tabelas, definidas em `supabase/migrations/20260814120000_leads.sql` (comentada em detalhe — leia o arquivo para o raciocínio completo de cada `constraint`/`grant`/`policy`; aqui vai só o resumo):

### `public.leads`

Um pedido de avaliação enviado pelo formulário. Modelagem deliberadamente rasa (sem tabela de histórico de status, sem normalizar `tratamento`) — o volume esperado é de dezenas a poucas centenas de linhas por mês numa clínica local.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | `uuid` | gerado no servidor (`crypto.randomUUID()`), não no banco — ver "Um fluxo rastreado" abaixo |
| `created_at` / `atualizado_em` | `timestamptz` | `atualizado_em` é mantido por trigger a cada `UPDATE` — é a data do último contato real, usada pelo expurgo de retenção (ver `supabase/data-subject-requests.sql`) |
| `nome`, `telefone`, `melhor_horario` | `text` | dado pessoal comum |
| `tratamento` | `text` | **dado de saúde (LGPD art. 11)** — tratado como categoria especial em todo o resto do sistema (logs, RLS) |
| `consentimento_lgpd` | `boolean not null` | `CHECK (... is true)` — impossível existir uma linha sem consentimento, mesmo pulando a rota |
| `consentimento_marketing` | `boolean` | opcional, coletado separadamente do de saúde (exigência de finalidades distintas) |
| `politica_versao` | `text` | qual versão de `PRIVACIDADE.md` foi aceita — rastreabilidade de consentimento (LGPD art. 8º §2º) |
| `status` | `text` | `novo` → `contatado` → `agendado` → `compareceu`, editável só pela equipe |

Todos os limites de tamanho têm `CHECK constraint` no banco **e** validação equivalente em `app/lib/leads.ts` — de propósito duplicado: a rota é *um* caller possível, mas a `service_role` ignora RLS e não deveria ser o único freio contra um script de importação ou uma rota futura que esqueça de validar.

### `public.admin_users`

Allowlist de quem é "equipe da clínica" — `user_id` referenciando `auth.users`, gerenciada à mão pelo dono do projeto (sem tela de convite). Existe porque o Supabase Auth aceita cadastro público por padrão: sem essa allowlist, qualquer pessoa na internet criaria uma conta e — sendo `authenticated` — passaria a ler todos os leads.

---

## A decisão mais importante do projeto: autorização por RLS, não por `if` no TypeScript

Esta é a peça que a revisão de segurança apontou como a melhor decisão arquitetural do código, e vale preservar o raciocínio aqui.

**O problema que isso evita.** O jeito mais direto de montar `/admin/leads` seria: usar a chave `service_role` (que ignora Row Level Security) para buscar os leads, e decidir em TypeScript se o usuário logado pode vê-los. Isso funciona — até o dia em que um `return` é esquecido, um layout renderiza antes do redirect, ou uma rota nova é copiada e colada sem levar a checagem junto. Nesse cenário, o bug vira **vazamento de dado de saúde**: a query já rodou com privilégio total, e a única coisa que faltou foi um `if`.

**Como o projeto evita isso.** `/admin` nunca usa `service_role`. As páginas e Server Actions do painel (`app/lib/supabase/server.ts`) leem/escrevem usando a chave `anon` **mais o JWT da sessão do usuário logado** — exatamente como o navegador de um visitante comum faria, só que autenticado. Quem decide se aquela sessão pode ler a linha é a *policy* de RLS no Postgres (`is_clinic_staff()`, definida na migração), não uma condição no código da aplicação.

**A consequência concreta que essa escolha compra**: se `/admin/leads` tiver um bug de controle de acesso amanhã — um `if` errado, um componente que renderiza cedo demais — o pior caso possível é uma **tabela vazia**, não uma tabela com dado de paciente. A superfície de erro que normalmente existiria em TypeScript foi movida para dentro do banco, onde há uma única definição de política, testada diretamente (`supabase/tests/rls_leads.test.sql`) e reforçada por `GRANT`s por coluna (a equipe só pode fazer `UPDATE` da coluna `status` — nem um bug no código consegue reescrever `nome`/`telefone`, porque o Postgres nem concede esse privilégio).

`service_role` continua existindo — mas só em três lugares, todos no servidor, nunca acessíveis por sessão de usuário: `app/api/leads/route.ts` (o único caminho de `INSERT`, já que não há policy de `INSERT` para ninguém), `app/api/keepalive/route.ts` e `app/api/backup-export/route.ts`. `app/lib/supabase/admin.ts` documenta essa fronteira no próprio código, e `import "server-only"` no topo de todo módulo que toca a chave transforma um uso indevido num componente de cliente em **erro de build**, não num vazamento descoberto depois.

---

## Superfície de integração

### HTTP — Route Handlers do Next.js (Cloudflare Workers)

#### `POST /api/leads` — recebe o formulário de agendamento

- **Endereço**: `POST /api/leads` (`app/api/leads/route.ts`).
- **Entrada**: JSON — `{ nome, telefone, melhor_horario, tratamento, consentimento_lgpd, consentimento_marketing, politica_versao, _gotcha, "cf-turnstile-response" }`. Contrato completo, com o motivo de cada campo, documentado no topo de `app/components/BookingForm.tsx` e de `app/api/leads/route.ts`.
- **Saída**: sucesso `201 { ok: true }`. Falha `4xx/5xx { ok: false, error: string, code: string }` — `code` é um rótulo estável (`formato` | `limite` | `grande` | `desafio` | `validacao` | `indisponivel`) que o cliente usa para reagir de forma diferente sem casar string de mensagem; deliberadamente não carrega o motivo interno da recusa (isso fica só no log do servidor), para não virar um oráculo que ensina um atacante a contornar os filtros um a um.
- **Quem pode chamar**: qualquer cliente na internet (é o formulário público) — a defesa não é autenticação, é uma cadeia de checagens em ordem crescente de custo: content-type → rate limit por IP (`app/lib/rate-limit.ts`, 5/10min, best-effort por isolate) → teto de corpo (4 KB) → honeypot `_gotcha` (responde sucesso falso, de propósito, para não ensinar o bot) → **Cloudflare Turnstile** (`app/lib/turnstile.ts`, o portão real) → validação de campo (`validateLeadPayload`). A posição do Turnstile *antes* do insert é o ponto todo: ver "Jobs em segundo plano" abaixo.
- **Como falha**: ver a lista de `code` acima. Casos notáveis: sem `TURNSTILE_SECRET_KEY` em produção, a rota nega **tudo** com `503`/`desafio` (negar por padrão — deixar passar recriaria em silêncio o buraco que o Turnstile fecha); se o Supabase estiver pausado por inatividade, o `INSERT` falha e a rota responde erro — o visitante ainda tem o WhatsApp (botão flutuante) como caminho alternativo, que não depende desta rota.
- **O que muda**: grava uma linha em `public.leads`. Sem aviso por e-mail — a clínica decidiu (2026-08-20) usar só o botão "Confirmar pelo WhatsApp" que a página mostra após o envio.

#### `GET|POST /api/keepalive` e `GET|POST /api/backup-export`

Não são endpoints de produto — existem só para os Cron Triggers da Cloudflare chamarem. Ver "Jobs em segundo plano" abaixo para o que cada um faz e por quê. Ambos:
- **Endereçados** por bearer token (`Authorization: Bearer <segredo>` ou header dedicado), comparado em tempo constante.
- **Autorização**: um segredo compartilhado (`KEEPALIVE_SECRET` / `BACKUP_EXPORT_SECRET`), nunca sessão de usuário — quem chama é o próprio Worker, via *service binding* (`WORKER_SELF_REFERENCE` em `wrangler.jsonc`), não uma requisição externa.
- **Como falham**: resposta **uniformemente 401** tanto para "segredo ausente/não configurado" quanto para "segredo errado" — de propósito, para não revelar a um chamador não autenticado se a rota já foi configurada ou não (a distinção fica só no log do servidor).

### Server Actions — `/admin` (sessão do usuário, governada por RLS)

Não são rotas HTTP no sentido REST — são funções `"use server"` em `app/admin/actions.ts`, chamadas pelo próprio formulário React do painel. Documentadas aqui porque são a superfície de escrita do painel:

| Ação | O que faz | Quem pode chamar | Onde a autorização real mora |
|---|---|---|---|
| `signIn` | `supabase.auth.signInWithPassword` | Qualquer um (rate limit 10/10min por IP) | Supabase Auth decide se e-mail/senha batem; mensagem de erro é deliberadamente igual para "e-mail não existe" e "senha errada" |
| `signOut` | `supabase.auth.signOut` | Sessão autenticada | — |
| `updateLeadStatus` | `UPDATE leads SET status = ...` | Sessão autenticada **e** presente em `admin_users` | RLS + `GRANT UPDATE (status)` no Postgres — a checagem em TypeScript aqui é só para dar mensagem decente, não é o que barra de fato |

Leitura da lista de leads (`app/admin/leads/page.tsx`) segue a mesma régua: `createUserClient()` (chave `anon` + sessão), nunca `service_role` — ver seção de RLS acima.

### Terceiros — chamadas de saída

| Serviço | Chamado por | Direção | O que trafega |
|---|---|---|---|
| **Cloudflare Turnstile** (`siteverify`) | `app/lib/turnstile.ts` | server → Cloudflare | token do widget + IP do visitante; nunca dado do formulário |
| **Supabase** (Postgres + Auth, via `@supabase/supabase-js` / `@supabase/ssr`) | `app/api/*`, `app/admin/*`, `middleware.ts` | server → Supabase | todo o dado do lead (via `service_role` no insert) ou o subconjunto que a RLS libera (via sessão) |
| **Cloudflare R2** | `app/api/backup-export/route.ts` | server → R2 (mesma conta Cloudflare) | dump completo semanal de `leads`, incluindo `tratamento` |

---

## Jobs em segundo plano (Cron Triggers)

Dois crons, definidos em `wrangler.jsonc` e roteados por `workers/entry.ts` (o adapter OpenNext não expõe um jeito de acrescentar um handler `scheduled` ao `fetch` que ele gera, então este arquivo importa o handler gerado e soma o `scheduled` por cima — ver comentário no próprio arquivo). Detalhes de agendamento, monitoramento e depuração: `docs/DEPLOY.md`, seção "Cron Triggers".

- **Keep-alive (diário)** — `GET /api/keepalive`. O Supabase free pausa um projeto depois de 7 dias sem atividade; um site de clínica local pode passar uma semana sem nenhum lead. Sem isso, o formulário quebraria justamente para o primeiro visitante depois do silêncio. A rota faz uma contagem trivial (`head: true`) — nenhuma linha trafega, é só para o projeto registrar atividade.
- **Backup export (semanal)** — `GET /api/backup-export`. O plano free do Supabase **não tem backup automático** (confirmado contra a documentação do Supabase — só Pro/Team/Enterprise). Sem essa rota, a única cópia dos leads seria a tabela em produção: reverter um deploy não desfaz uma migração ruim ou um `DELETE` sem `WHERE`. A rota lê `leads` inteira e grava um JSON no bucket R2 `BACKUPS_BUCKET`, mantendo só os 8 dumps mais recentes (~2 meses, decidido por compliance — guardar mais não serve à finalidade de recuperação de falha recente e só aumentaria a superfície de vazamento de dado de saúde). **Pendência de compliance**: a Cloudflare não oferece região sul-americana para R2, então o backup fica fora do Brasil mesmo que o banco esteja em São Paulo — ver checklist de pendências no `README.md`.

---

## Consentimento e LGPD

O desenho de consentimento no formulário (dois checkboxes separados, versão da política gravada pelo servidor) está comentado em detalhe em `app/lib/leads.ts` e `app/components/BookingForm.tsx` — o raciocínio completo de cada decisão vive no código, perto de onde ela é aplicada, para não divergir do comportamento real.

O conteúdo legal em si — quem é o controlador, quais operadores recebem o quê, prazo de retenção, base legal de cada tratamento, transferência internacional — é responsabilidade de [`PRIVACIDADE.md`](../PRIVACIDADE.md) e [`TERMOS.md`](../TERMOS.md) (espelhadas em `app/privacidade/page.tsx` e `app/termos/page.tsx`). Este documento **não duplica** esse conteúdo — ele muda de fonte única para não divergir. Dois pontos que a arquitetura precisa que quem for mexer no código saiba, porque conectam decisão técnica a texto legal:

- **`CURRENT_POLICY_VERSION`** (`app/lib/leads.ts`) precisa ser bumpada no mesmo commit que qualquer mudança de substância em `PRIVACIDADE.md` — é o que prova qual texto cada titular efetivamente aceitou (LGPD art. 8º §2º). Ver comentário completo na constante.
- **Ambas as páginas legais são minutas de IA, explicitamente não revisadas por advogado**, com bloqueadores de publicação abertos (região do Supabase, região do bucket R2) — ver checklist no `README.md`. Isso não afeta o mecanismo de consentimento em si, só o texto que ele referencia.

---

## Um fluxo rastreado ponta a ponta: agendamento pelo formulário

Este é o caminho que exercita mais partes do sistema de uma vez — do clique do usuário até o painel refletir o novo pedido.

1. **Usuário preenche o formulário** na home (`app/components/BookingForm.tsx`), marca o checkbox `consentimento_lgpd` (obrigatório — HTML5 `required` bloqueia o submit sem JS precisar entrar em ação) e resolve o widget do Turnstile (`app/components/TurnstileWidget.tsx`), que guarda um token de uso único em estado do React.
2. **Clique em "Solicitar avaliação"** dispara `handleSubmit`. Sem sitekey configurada ou sem token do Turnstile ainda resolvido, o formulário nem tenta a rede — mostra a mensagem de erro (com alternativa de WhatsApp) na hora.
3. **Requisição**: `fetch('/api/leads', { method: 'POST', body: JSON.stringify(payload) })`, com timeout de 15s via `AbortController` e trava contra clique duplo (`sending` desabilita o botão).
4. **No servidor** (`app/api/leads/route.ts`), em ordem: content-type → rate limit por IP → teto de corpo → honeypot `_gotcha` (bot recebe sucesso falso e some, sem aprender nada) → **Turnstile** (`verifyTurnstile`, chama o `siteverify` da Cloudflare) → `validateLeadPayload` (`app/lib/leads.ts`, que também decide o `politica_versao` real, ignorando o que o cliente mandou).
5. **Grava o lead**: um `id` é gerado no servidor (`crypto.randomUUID()`) e o `INSERT` no Supabase roda (via `service_role`, `app/lib/supabase/admin.ts`).
6. **A resposta depende só do banco**: se o `INSERT` falhar (ex. projeto Supabase pausado), a rota responde erro. Se funcionar, responde sucesso e o React monta o link `wa.me` do botão "Confirmar pelo WhatsApp" (`buildWhatsAppUrl`, `app/lib/site-config.ts`) com nome, tratamento e melhor horário já preenchidos — sem nenhuma chamada de servidor, é o visitante quem decide clicar.
7. **UI atualiza**: `showFeedback`-equivalente no React mostra a mensagem de sucesso/erro (`role="status" aria-live="polite"`) e o botão do WhatsApp quando aplicável, o formulário é limpo e o Turnstile pede um token novo (o antigo já foi consumido — a Cloudflare recusa reuso).
8. **A equipe vê o pedido** ao abrir `/admin/leads` (`app/admin/leads/page.tsx`): a página lê `leads` com a **sessão do usuário logado** (chave `anon`), e a RLS do Postgres decide se aquela sessão está em `admin_users`. Mudar o status (`StatusForm` → `updateLeadStatus` em `app/admin/actions.ts`) é um Server Action que faz `UPDATE ... SET status = ...`, novamente pela sessão do usuário — nunca `service_role`.

Se qualquer etapa entre 3 e 6 falhar, o padrão se repete com uma mensagem de erro específica (ver a lista de `code` na seção "Superfície de integração" acima), sempre com uma alternativa de contato (WhatsApp) — nunca uma falha silenciosa.

---

## Analytics: o padrão de troca única (`trackEvent`)

Nenhuma ferramenta de analytics está conectada hoje. Toda a instrumentação do site (`app/lib/analytics.ts`) passa por uma única função:

```ts
export function trackEvent(name: string, props?: AnalyticsProps): void {
  if (typeof window !== "undefined") console.debug("[Clínac][analytics]", name, props ?? {});
}
```

Para ligar uma ferramenta de verdade, troca-se **só o corpo dessa função** (mais o snippet do provedor em `app/layout.tsx`) — nenhum outro ponto do app muda. Hoje os eventos só vão para o console do navegador; nada sai do site.

**Eventos disparados** (nenhum carrega nome, telefone ou e-mail): `whatsapp_click` (`{ source: 'floating' | 'inline' }`), `form_submit_success` (sem propriedades — contagem de conversão, não registro de quem converteu) e `treatment_interest_selected` (`{ treatment: <rótulo> }`, lido do `<select>` antes do `form.reset()`, nunca associado a dado pessoal).

**Recomendação registrada no código** (decisão do dono do site, não executada): uma ferramenta "privacy-first" sem cookies (Plausible, Fathom) em vez de GA4 — porque compliance confirmou que o site hoje **não precisa** de banner de cookies, e GA4 reintroduziria essa exigência. Se uma ferramenta real for ligada, a §2.6 de `PRIVACIDADE.md` (que hoje afirma ausência de rastreamento) precisa ser atualizada **na mesma mudança** — ver checklist no `README.md`.

---

## Acessibilidade — decisões não óbvias

Duas correções, herdadas do site estático original e preservadas na migração, valem registro porque não são óbvias ao ler o CSS isoladamente:

- **Foco visível sobre fundos escuros.** O outline padrão do navegador tem contraste insuficiente (~2.7:1) sobre os fundos verde-escuros do site (botões, caixa de agendamento, footer). Foi definido um anel de foco explícito (`outline: 2.5px solid var(--emerald-light)`, `app/globals.css`) testado nos dois contextos de fundo.
- **`prefers-reduced-motion` estava quebrando o herói, não só desativando a animação.** A ilustração SVG do hero e os pontinhos decorativos dependiam da *animação* para sair do estado inicial (traço escondido / opacidade zero) até o final (traço desenhado / visível). Um `animation: none !important` ingênuo travaria esses elementos no estado inicial — invisíveis — para quem pede menos movimento, o oposto do que a preferência deveria significar. A correção fixa esses elementos no estado final quando a preferência está ativa, em vez de simplesmente cancelar a animação.

---

## Verificação automatizada

Resumo — detalhes de comando e o que cada camada cobre estão no [`README.md`](../README.md#-como-rodar-as-verificações):

- **Vitest** (`npm run test`) cobre a lógica de validação/autorização do caminho crítico: `app/lib/leads.test.ts` (o portão de consentimento LGPD, `validateLeadPayload`), `app/api/leads/route.test.ts` (a rota `POST /api/leads` de ponta a ponta, Supabase mockado) e `app/lib/rate-limit.test.ts`.
- **`scripts/check-app.js`** — checagem mecânica zero-dependência (rotas-chave existem, `consentimento_lgpd` continua `required`, `alt` de `<img>`, toda env var documentada em `.env.example`). Não navega o site, não substitui QA manual.
- **`supabase/tests/rls_leads.test.sql`** — testa as RLS policies e `GRANT`s direto no Postgres (não via app): `anon` não lê/escreve nada, `authenticated` fora de `admin_users` vê zero linhas, `authenticated` na allowlist só altera a coluna `status`. Não roda em CI (exige Postgres real) — rodar manualmente antes do lançamento e após qualquer mudança na migração de RLS.
- Não há teste de UI/browser (Playwright etc.) — decisão deliberada de custo/benefício para este porte de projeto, coberta por um checklist manual (ver `README.md`).
