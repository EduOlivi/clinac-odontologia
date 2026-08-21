# 🦷 Clínac Odontologia

Site institucional e captação de agendamentos para uma clínica odontológica — página única (one-page) com apresentação dos tratamentos, diferenciais da clínica, depoimentos e um formulário de agendamento que grava o pedido num banco de verdade e oferece confirmação pelo WhatsApp. Painel administrativo simples (`/admin`) para a equipe acompanhar e atualizar o status de cada pedido.

![Status](https://img.shields.io/badge/status-quase_pronto_(ver_pend%C3%AAncias)-C97B2E?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js_16-white?style=flat-square&logo=next.js&logoColor=000)
![TypeScript](https://img.shields.io/badge/TypeScript-white?style=flat-square&logo=typescript&logoColor=3178C6)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-white?style=flat-square&logo=cloudflare&logoColor=F38020)
![Supabase](https://img.shields.io/badge/Supabase-white?style=flat-square&logo=supabase&logoColor=3FCF8E)
![License](https://img.shields.io/badge/licença-MIT-0E3B2C?style=flat-square)

---

## 📋 Sobre o projeto

Página única criada para apresentar os serviços da Clínac Odontologia, gerar credibilidade e direcionar visitantes para o agendamento de consultas — seja por formulário ou WhatsApp. O design segue uma identidade visual autoral em tons de branco e verde, com tipografia serifada nos títulos e elementos que remetem ao universo odontológico (como a organização dos tratamentos por notação dentária).

Este projeto começou como um site 100% estático (HTML/CSS/JS + Formspree) e foi **totalmente reconstruído** como uma aplicação Next.js com backend próprio, ao longo de um ciclo completo de revisão por especialistas (produto, backend, frontend, devops, design, segurança, QA e compliance). O resultado é uma aplicação funcionalmente pronta, mas com **pendências reais que só o dono do site pode resolver** — veja [Pendências antes do lançamento](#️-pendências-antes-do-lançamento) antes de publicar.

---

## 🚀 Funcionalidades

- **Hero animado**, seções de tratamentos (organizados por notação dentária FDI), institucional, depoimentos e carrossel de implantes — herdadas do site original, agora como componentes React.
- **Formulário de agendamento** (`app/components/BookingForm.tsx`) que grava o pedido direto no banco via `POST /api/leads`, protegido por Cloudflare Turnstile (anti-bot), rate limit por IP, honeypot e validação em duas camadas (servidor + banco).
- **Fluxo de consentimento LGPD** no formulário: checkbox obrigatório para dado de saúde (com transferência internacional declarada), checkbox opcional para marketing, e versão da política gravada pelo servidor — nunca pelo cliente.
- **Confirmação pelo WhatsApp**: depois de um envio aceito, o site mostra um botão "Confirmar pelo WhatsApp" com mensagem pré-preenchida — link `wa.me`, sem nenhuma API/automação por trás, é o visitante quem decide enviar.
- **Painel `/admin`** — login via Supabase Auth, lista de pedidos e atualização de status, com autorização garantida por Row Level Security no Postgres (não por lógica no servidor Next.js).
- **Backup semanal automático** dos pedidos para um bucket Cloudflare R2 (o Supabase free não faz backup automático).
- **Keep-alive diário** para o projeto Supabase não pausar por inatividade.
- **Acessibilidade** — foco visível sobre fundos escuros, `prefers-reduced-motion` respeitado sem quebrar a ilustração do herói, carrossel operável por teclado.

Para o "como" e o "porquê" de cada uma dessas peças, ver [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

---

## 🎨 Identidade visual

| Elemento | Detalhe |
|---|---|
| Cor primária | `#0E3B2C` (verde-pinho) |
| Cor de destaque | `#1F7A53` (verde-esmeralda) |
| Cor secundária | `#9FC4AE` (verde-sálvia) |
| Fundo | `#FBFDFC` (branco-papel) |
| Tipografia de títulos | [Fraunces](https://fonts.google.com/specimen/Fraunces) (serifada) |
| Tipografia de texto | [Libre Franklin](https://fonts.google.com/specimen/Libre+Franklin) |
| Tipografia de detalhes | [Space Mono](https://fonts.google.com/specimen/Space+Mono) |

---

## 🛠️ Tecnologias

| Camada | Tecnologia | Por quê |
|---|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, TypeScript, React 19) | SSR/Server Actions/Route Handlers num único framework |
| Hospedagem | [Cloudflare Workers](https://workers.cloudflare.com), via [OpenNext](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`) | Plano free sem restrição de uso comercial (diferente do Hobby da Vercel) — ver [`docs/DEPLOY.md`](docs/DEPLOY.md) |
| Banco de dados | [Supabase](https://supabase.com) (Postgres) | Auth + Row Level Security para o painel, sem precisar montar autorização própria |
| Anti-bot | [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) | Portão real contra envio automatizado no `/api/leads` |
| Backup | Cloudflare R2 | O Supabase free não tem backup automático |
| Testes | [Vitest](https://vitest.dev) + SQL de RLS via `psql` | Ver [Como rodar as verificações](#-como-rodar-as-verificações) |

Detalhes de cada decisão (por que Supabase, por que Turnstile, por que `middleware.ts` e não `proxy.ts`, etc.) estão em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) e [`docs/DEPLOY.md`](docs/DEPLOY.md).

---

## 💻 Como executar localmente

### Pré-requisitos

- Node.js 22 (versão usada no CI — ver `.github/workflows/ci.yml`)
- Uma conta Supabase (gratuita) — só é estritamente necessária para testar o formulário/painel de ponta a ponta; o resto do site (`next dev`) sobe sem ela

### Passos

```bash
git clone <url-do-repositório>
cd clinac-odontologia
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

### Configuração necessária (variáveis de ambiente)

`.env.example` é a fonte de verdade — cada variável tem, no próprio arquivo, um comentário explicando o que é e onde obter o valor real. Resumo:

| Variável | Obrigatória para rodar local? | Observação |
|---|---|---|
| `SUPABASE_URL` | Sim, para testar `/api/leads` ou `/admin` de verdade | Painel Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | Sim, idem | Idem |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim, idem | Idem — nunca vaza para o cliente (`import "server-only"` trava isso no build) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | **Não** — já vem com a chave de teste oficial da Cloudflare ("sempre aprova") | Troque só antes de publicar |
| `TURNSTILE_SECRET_KEY` | **Não** — mesma lógica | Idem |
| `KEEPALIVE_SECRET` / `BACKUP_EXPORT_SECRET` | Não, para `next dev` | Só importam para os crons em produção — ver `docs/DEPLOY.md` |
| `NEXT_PUBLIC_SITE_URL` | Não | Tem fallback no código |

Sem `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`, `next dev` sobe normalmente, mas enviar o formulário ou abrir `/admin` falha com um erro de configuração explicado (ver `app/lib/env.ts`) em vez de um erro genérico.

Para rodar o Worker de verdade (não só `next dev`) localmente, ver `npm run preview` e o arquivo `.dev.vars` — detalhes em [`docs/DEPLOY.md`](docs/DEPLOY.md#local-dev-preview-e-diferenças).

---

## ✅ Como rodar as verificações

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (inclui jsx-a11y)
npm run test         # vitest — valida o portão de consentimento LGPD e a
                      # rota POST /api/leads de ponta a ponta (Supabase
                      # mockado; não precisa de credenciais reais)
npm run check        # scripts/check-app.js — checagem mecânica zero-dependência:
                      # rotas-chave existem, checkbox consentimento_lgpd
                      # continua `required`, alt de <img>, toda env var lida
                      # por app/lib/env.ts documentada em .env.example
npm run build         # next build
npm run build:worker  # opennextjs-cloudflare build — a build real do Worker
```

Os cinco primeiros comandos (`lint`, `typecheck`, `test`, `check`, `build`) são exatamente o job `verify` do CI (`.github/workflows/ci.yml`, que também roda `build:worker`) — rodar localmente antes de abrir um PR evita descobrir uma falha só depois do push.

**Não precisa de nenhum setup adicional** para os comandos acima (nenhum emulador, nenhuma segunda instalação de dependências) — o Vitest mocka o Supabase e usa as chaves de teste do Turnstile automaticamente.

### O que isso não cobre (de propósito)

- **RLS do Postgres** (quem pode ler/escrever `leads`) — `supabase/tests/rls_leads.test.sql`, direto contra um Postgres real (local via `supabase start` + Docker, ou um projeto Supabase de teste/descartável). Instruções completas no topo do próprio arquivo. Não roda em CI hoje — **precisa ser rodado manualmente antes do lançamento e após qualquer mudança na migração de RLS**.
- **Ponta a ponta contra Supabase real** — sem credenciais reais ainda (ver pendências abaixo). Assim que existirem, um teste manual de fumaça (preencher o formulário de verdade e conferir o lead em `/admin/leads`) deve rodar pelo menos uma vez.
- **UI/browser** (responsividade real, foco visível, `prefers-reduced-motion`) — decisão deliberada de custo/benefício para este porte de site, não uma lacuna esquecida. Fica como checklist manual:

<details>
<summary>Checklist manual pré-lançamento (rodar 1x antes de publicar, e de novo após mudança relevante)</summary>

- [ ] **Admin — acesso negado sem login**: abrir `/admin/leads` sem sessão → redireciona para `/admin/login`.
- [ ] **Admin — autenticado mas fora da allowlist**: logar com uma conta que existe no Supabase Auth mas NÃO está em `admin_users` → tela mostra "sem permissão", não a tabela de leads.
- [ ] **Admin — staff vê e atualiza**: logar com uma conta em `admin_users`, conferir que a lista aparece e que trocar o status de um lead persiste após recarregar.
- [ ] **Booking — consentimento bloqueia envio de verdade**: no formulário renderizado, tentar enviar sem marcar o checkbox obrigatório → o navegador impede o submit.
- [ ] **Booking — fumaça ponta a ponta**: com Supabase/Turnstile reais, preencher e enviar de verdade; conferir sucesso, lead em `/admin/leads` e o botão "Confirmar pelo WhatsApp" abrindo com a mensagem certa.
- [ ] **Responsivo — booking e admin**: mobile (~375px), tablet (~768px) e desktop, sem overflow horizontal nem elemento inalcançável.
- [ ] **Teclado — carrossel e menu**: navegar por Tab até os pontinhos do carrossel de implantes e o menu mobile; foco visível, Enter/Espaço ativam.
- [ ] **`prefers-reduced-motion`**: ativar no SO/navegador e recarregar a home — a ilustração do hero aparece no estado final (visível), não travada em transparente.

</details>

---

## 📁 Estrutura do projeto

```
clinac-odontologia/
├── app/
│   ├── page.tsx, layout.tsx, globals.css   # home (one-page) e layout raiz
│   ├── components/                          # Hero, BookingForm, TurnstileWidget, etc.
│   ├── lib/
│   │   ├── env.ts                            # única porta de leitura de env vars (server-only)
│   │   ├── leads.ts                          # tipos + validação, compartilhado cliente/servidor
│   │   ├── turnstile.ts                      # verificação server-side do Turnstile
│   │   ├── rate-limit.ts, site-config.ts
│   │   └── supabase/
│   │       ├── admin.ts                      # cliente com service_role (ignora RLS)
│   │       └── server.ts                     # cliente com sessão do usuário (respeita RLS)
│   ├── api/
│   │   ├── leads/route.ts                    # POST /api/leads
│   │   ├── keepalive/route.ts                # GET|POST /api/keepalive (cron diário)
│   │   └── backup-export/route.ts            # GET|POST /api/backup-export (cron semanal)
│   ├── admin/
│   │   ├── actions.ts                        # Server Actions: signIn, signOut, updateLeadStatus
│   │   ├── login/, leads/                    # telas do painel
│   │   └── page.tsx                          # redireciona para /admin/leads
│   ├── privacidade/page.tsx, termos/page.tsx # espelhos de PRIVACIDADE.md / TERMOS.md
│   └── layout.tsx
├── middleware.ts             # renova a sessão do painel /admin/* (ver docs/DEPLOY.md)
├── workers/entry.ts          # entrada real do Worker — soma o handler `scheduled` (crons) ao gerado pelo OpenNext
├── wrangler.jsonc            # config do Worker (bindings, crons, vars públicas)
├── supabase/
│   ├── migrations/20260814120000_leads.sql   # schema + RLS de `leads`/`admin_users`
│   ├── data-subject-requests.sql             # consultas manuais para pedidos LGPD (art. 18)
│   └── tests/rls_leads.test.sql              # teste de RLS, roda direto no Postgres
├── scripts/check-app.js      # checagem mecânica zero-dependência (ver acima)
├── .env.example               # fonte de verdade de toda variável de ambiente
├── PRIVACIDADE.md, TERMOS.md  # fonte em Markdown das páginas legais (v2.0, ver pendências)
├── docs/
│   ├── ARQUITETURA.md         # como o sistema funciona por dentro e por quê
│   └── DEPLOY.md              # pipeline, secrets, cron, backup, rollback
└── README.md                  # este arquivo
```

---

## ⚠️ Pendências antes do lançamento

Estas são decisões e informações que **só o dono do site pode resolver** — não foram (e não deveriam ser) inventadas ou corrigidas automaticamente durante a revisão. Consolidado a partir dos relatórios de backend, devops, segurança, QA e compliance deste ciclo.

### Infraestrutura — criar as contas reais

- [ ] **Supabase**: criar o projeto real. **Decisão obrigatória e bloqueadora de publicação da política de privacidade**: a região do projeto (`PRIVACIDADE.md` §4.1 traz duas redações alternativas — banco em São Paulo × banco fora do Brasil — e não pode ir ao ar com as duas). Depois de criado: rodar `supabase/migrations/20260814120000_leads.sql`, desligar "Allow new users to sign up" (Authentication → Sign In/Providers) e popular `admin_users` com a conta da equipe (passo a passo no fim do próprio arquivo de migração).
- [ ] **Cloudflare Turnstile**: criar o widget real (painel Cloudflare → Turnstile → Add widget, modo Managed) — sem isso em produção, `TURNSTILE_SECRET_KEY` fica ausente e o formulário **nega todo envio** (comportamento deliberado, ver `docs/DEPLOY.md`).
- [ ] **Região do bucket R2 (backup)**: confirmar no painel (R2 → bucket → Settings) qual região o bucket recebeu. A Cloudflare **não oferece região na América do Sul para R2** — então o backup semanal (que contém dado de saúde) fica fora do Brasil **independentemente** da região escolhida para o Supabase. Preencher `PRIVACIDADE.md` §4/§4.1 com o resultado.
- [ ] **Todos os secrets do Worker**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `KEEPALIVE_SECRET`, `BACKUP_EXPORT_SECRET`, `TURNSTILE_SECRET_KEY` via `wrangler secret put`, mais `NEXT_PUBLIC_TURNSTILE_SITE_KEY` como variável de **build** (GitHub Actions *variable*, não *secret* — ver `docs/DEPLOY.md`, seção "Cloudflare Turnstile"). Checklist completo com onde cada uma vive: `docs/DEPLOY.md` → "Variáveis de ambiente/secrets — checklist completo".

### Segurança e QA — verificações ainda não executadas

- [ ] Rodar `npm audit` e um secret-scan (ex. `gitleaks`/`trufflehog`) antes de ir ao ar — sinalizado pela revisão de segurança como não verificado ainda nesta rodada.
- [ ] Rodar `supabase/tests/rls_leads.test.sql` contra um Postgres real (local via `supabase start`+Docker, ou um projeto Supabase de teste) — não foi possível executar durante esta rodada de QA por falta de Docker/Supabase CLI no ambiente. Rodar antes do lançamento e após qualquer mudança na migração de RLS.
- [ ] Depois que as credenciais reais acima existirem: um teste manual de fumaça ponta a ponta (preencher o formulário de verdade, conferir o lead em `/admin/leads` e o botão "Confirmar pelo WhatsApp").
- [ ] (Recomendado, não bloqueador) Cadastrar um checador de uptime externo gratuito (ex. UptimeRobot) apontando para a home — a Cloudflare free não avisa proativamente sobre indisponibilidade. Ver `docs/DEPLOY.md`.

### Dados reais da clínica (hoje todos são placeholder)

- [ ] **WhatsApp** (`app/lib/site-config.ts`, `WHATSAPP_URL`) — o número atual (`https://wa.me/553133004455`) tem cara de telefone fixo de BH (8 dígitos, sem o 9 do celular), não de linha com WhatsApp Business. Confirmar que é um número real com WhatsApp ativo.
- [ ] **Rodapé** (`app/components/Footer.tsx`) — telefone, e-mail e endereço são placeholder (marcados no código).
- [ ] **CRO-MG** (rodapé, `app/components/Footer.tsx`) — hoje `CRO-MG 00000`. Exigido pela Resolução CFO-196/2019 para publicidade odontológica.
- [ ] **Horários de atendimento** (rodapé) — placeholder.
- [ ] **Estatísticas do hero** (`app/components/Hero.tsx`: "12 anos", "4.9/5 em mais de 800 avaliações", "500+ implantes") — sem fonte documentada. Confirmar os números reais ou suavizar a redação.
- [ ] **Depoimentos de pacientes** (`app/components/Testimonials.tsx`) e as estatísticas do hero acima **podem conflitar com a Resolução CFO-196/2019**, que restringe a divulgação de depoimentos em publicidade odontológica. **Isto não é um ajuste de código** — precisa do aval do responsável técnico/CRO-MG da própria clínica. A seção não foi removida; a decisão é do dono do site. (Sinalizado desde a versão estática original do site — ainda em aberto.)

### Páginas legais (`PRIVACIDADE.md` + `/privacidade`, `TERMOS.md` + `/termos`) — v2.0, atualizadas em 2026-08-14

- [ ] **Revisão jurídica** — ambos os documentos são minutas redigidas por IA, explicitamente marcadas no próprio texto como não revisadas por advogado. Continuam com campos `[PREENCHER]` em aberto (razão social, CNPJ, endereço, CRO-MG da pessoa jurídica e do responsável técnico, e-mail do canal de privacidade, prazo de guarda de prontuário, foro/comarca). **Não publicar como versão final sem essa revisão.**
- [ ] **BLOQUEADOR — região do Supabase** (ver acima).
- [ ] **BLOQUEADOR — região do bucket R2** (ver acima).
- [ ] Se/quando uma ferramenta de analytics real for ligada (ver `docs/ARQUITETURA.md`), atualizar a §2.6 de `PRIVACIDADE.md` **na mesma mudança** — hoje ela afirma que o site não rastreia audiência e por isso não exibe banner de cookies; isso deixa de ser verdade se a ferramenta usar cookie/fingerprint.
- [ ] Confirmar a URL pública estável de `/privacidade` e `/termos` depois que o domínio próprio existir, e apontar essa URL onde for exigida (ex.: rodapé, cadastro de app/loja se algum dia existir).
- [ ] Publicar as páginas `/privacidade` e `/termos` como parte do próprio deploy do site é o caminho já implementado (não é um site separado) — não há pendência de "onde publicar", só de domínio final.

---

## 📄 Licença

Este projeto está sob a licença MIT.

## 👤 Autor

Desenvolvido por **[Eduardo Olivi](https://github.com/EduOlivi)**.
