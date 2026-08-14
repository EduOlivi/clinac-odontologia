# Deploy — Clínac Odontologia

Este documento é para quem for rodar ou depurar o deploy sozinho, sem ter acompanhado as decisões — o "manual do mantenedor solo". Para arquitetura da aplicação em si (Supabase, LGPD, analytics), ver [`ARQUITETURA.md`](ARQUITETURA.md). Para o que falta configurar antes do lançamento, ver o [`README.md`](../README.md).

**Stack de deploy**: Next.js 16 rodando em **Cloudflare Workers**, via o adapter [OpenNext](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`). Essa combinação — e não Vercel — foi escolhida deliberadamente: o plano Hobby da Vercel proíbe uso comercial nos termos de serviço, e esta é uma clínica de verdade. Cloudflare Workers tem plano free sem essa restrição.

---

## Visão geral do pipeline

```
git push origin main
  │
  ├── GitHub Actions "verify"  (todo push/PR) — lint, typecheck, next build,
  │     opennextjs-cloudflare build. Não fala com a Cloudflare, não precisa
  │     de nenhum segredo do site.
  │
  └── GitHub Actions "deploy"  (só push em main, só se "verify" passar) —
        opennextjs-cloudflare build && opennextjs-cloudflare deploy.
        Autentica na Cloudflare só com CLOUDFLARE_API_TOKEN/ACCOUNT_ID.
        Publica o Worker imediatamente (sem staging — ver "Por que não
        staging" abaixo).
```

Não existe ambiente de staging. Existe **um** ambiente (produção) mais o preview local (`npm run preview`, roda o Worker de verdade via `workerd` na sua máquina) e o `next dev` do dia a dia. Ver "Por que não staging" mais abaixo.

---

## Primeiro deploy — passo a passo (o dono do site precisa rodar)

Nenhum destes passos pode ser feito por um agente de IA: todos exigem login na sua própria conta Cloudflare/Supabase/Resend com suas credenciais reais.

### 1. Login na Cloudflare

```bash
npx wrangler login
```

Abre o navegador, autoriza a CLI. Depois disso `wrangler whoami` confirma a conta.

### 2. Criar o bucket R2 de backup

```bash
npx wrangler r2 bucket create clinac-odontologia-backups
```

Ver seção "Backup e recuperação de dados" abaixo para o porquê. **Nota**: a Cloudflare historicamente pede um cartão cadastrado (Billing → Payment Methods) para habilitar R2 pela primeira vez, mesmo permanecendo inteiramente dentro do uso gratuito — não é uma cobrança automática, é só o gate de ativação do produto. Se o passo acima falhar pedindo isso, cadastre o cartão e rode de novo (ver também "Alertas de custo" abaixo sobre o que isso muda em termos de risco).

### 3. Cadastrar os secrets do Worker

Nenhum destes vai para `wrangler.jsonc` nem para o repositório — `wrangler secret put` grava do lado da Cloudflare, criptografado, e nunca aparece em log nem em `wrangler.jsonc`. Rode um por um (cada comando abre um prompt interativo pedindo o valor):

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put KEEPALIVE_SECRET
npx wrangler secret put BACKUP_EXPORT_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put LEAD_NOTIFICATION_FROM
npx wrangler secret put LEAD_NOTIFICATION_TO
```

`TURNSTILE_SECRET_KEY` exige ter criado o widget antes — ver a seção **"Cloudflare Turnstile"** logo abaixo, e note que a *sitekey* (a outra metade do par) **não** entra aqui: ela é pública e precisa estar presente no *build*, não no runtime.

Onde conseguir cada valor: ver `.env.example` (comentário acima de cada variável — inclui onde no painel do Supabase/Resend achar a chave, e o comando para gerar `KEEPALIVE_SECRET`/`BACKUP_EXPORT_SECRET`, que **devem ser dois valores aleatórios diferentes entre si**, não o mesmo texto reaproveitado).

`RESEND_API_KEY`/`LEAD_NOTIFICATION_FROM`/`LEAD_NOTIFICATION_TO` são opcionais — sem eles o site funciona, só não chega e-mail de aviso de lead novo (ver `.env.example`).

**Por que estes viram secret e não `vars` em `wrangler.jsonc`**: são credenciais de verdade (chave de acesso ao banco, chave de API de e-mail) ou destinatários pessoais (e-mail da recepção) — `vars` em `wrangler.jsonc` é texto plano, committado no repositório público. `NEXT_PUBLIC_SITE_URL`, `KEEPALIVE_ENDPOINT_PATH`, `BACKUP_EXPORT_ENDPOINT_PATH` e `LEAD_EMAIL_INCLUDE_HEALTH_DATA` ficam em `vars` porque não são segredo: a primeira já é pública por definição (prefixo `NEXT_PUBLIC_`), as duas seguintes são só um caminho de URL, e a última é um *feature flag* de compliance, não uma credencial.

### 4. Conferir a lista de secrets cadastrados

```bash
npx wrangler secret list
```

Mostra os **nomes**, nunca os valores.

### 5. Primeiro deploy manual (antes de configurar CI)

```bash
npm run deploy
```

Equivale a `opennextjs-cloudflare build && opennextjs-cloudflare deploy`. Ao final, o wrangler imprime a URL pública (`https://clinac-odontologia.<sua-conta>.workers.dev`) — teste o formulário e o `/admin` nela antes de configurar domínio próprio.

### 5b. Criar o widget do Cloudflare Turnstile

Ver a seção **"Cloudflare Turnstile"** abaixo — é passo obrigatório antes de o formulário funcionar em produção, e depende do painel da própria conta Cloudflare (nenhum agente/CI pode fazer por você).

### 6. Rodar a migração do Supabase (se ainda não rodou)

`supabase/migrations/20260814120000_leads.sql` — cole no SQL Editor do painel Supabase, ou `supabase db push` com o projeto linkado. Depois, o passo manual descrito no fim do próprio arquivo (criar o usuário da equipe e inseri-lo em `admin_users`).

### 7. Configurar o CI (opcional, mas recomendado — ver seção própria abaixo)

---

## Segredos: CI × Worker (por que são coisas diferentes)

O GitHub Actions **nunca** recebe `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` nem nenhum outro segredo do site. Ele só recebe `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` — o suficiente para autenticar `wrangler deploy`, nada mais. Os segredos do site em si moram só do lado da Cloudflare (passo 3 acima), gravados uma vez, e o deploy publica código novo sem nunca precisar reenviá-los. Menos lugares com a chave do banco = menos superfície.

---

## CI/CD — GitHub Actions

Arquivo: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

- **`verify`** roda em todo push e todo pull request: `npm run lint`, `npm run typecheck` (`tsc --noEmit`), `npm run build` (`next build`) e `npm run build:worker` (`opennextjs-cloudflare build` — o empacotamento real para Cloudflare, não só o Next). Se isto for verde, o site compila e empacota corretamente para o Worker; problemas específicos do runtime Workers (como o de `middleware.ts`/`proxy.ts` abaixo) aparecem aqui, não só em produção.
- **`deploy`** roda só em push direto/merge na branch `main`, e só depois de `verify` passar. Publica no Cloudflare Workers.

### Token da Cloudflare para o CI (escopo mínimo)

1. Painel Cloudflare → **My Profile → API Tokens** → **Create Token**.
2. Template **"Edit Cloudflare Workers"** (não crie um token de escopo "All accounts" nem use o Global API Key).
3. Em **Account Resources**, restrinja à conta específica onde este Worker é publicado — não deixe em "All accounts", mesmo que só exista uma conta hoje (evita que o token continue valendo se uma segunda conta for criada depois).
4. Criar, copiar o token (só aparece uma vez).
5. No repositório GitHub: **Settings → Secrets and variables → Actions** → adicionar:
   - `CLOUDFLARE_API_TOKEN` = o token gerado
   - `CLOUDFLARE_ACCOUNT_ID` = ID da conta (painel Cloudflare → barra lateral direita de qualquer página de conta, ou `wrangler whoami`)

Isso é exatamente o fluxo documentado pela própria Cloudflare para GitHub Actions (https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/).

### Alternativa mais simples, para considerar depois

A Cloudflare também tem **Workers Builds** — conectar o repositório GitHub direto no painel da Cloudflare, sem YAML nenhum, e ela builda/publica sozinha a cada push. Não foi o caminho escolhido aqui porque o pedido explícito era GitHub Actions (mais visível/depurável para quem já usa Actions em outros projetos), mas é uma opção genuinamente mais simples se o mantenedor preferir zero configuração de CI própria.

---

## Por que `middleware.ts` e não `proxy.ts`

**Isto vai ficar desatualizado — leia a data.** No Next.js 16, o antigo `middleware.ts` foi renomeado para `proxy.ts`, e a partir do Next 16 um arquivo `proxy.ts` roda **obrigatoriamente** no runtime Node.js (a opção de rodar em Edge foi removida desse arquivo especificamente). O adapter usado aqui (`@opennextjs/cloudflare` 1.20.2) **não suporta** middleware/proxy em Node.js — só Edge — e um mantenedor do projeto confirmou publicamente que isso não será suportado neste pacote (fica para uma "adapters API" separada, sem previsão): https://github.com/opennextjs/opennextjs-cloudflare/issues/1213.

`npx opennextjs-cloudflare build` falha com `Node.js middleware is not currently supported` se o arquivo se chamar `proxy.ts`. A convenção antiga `middleware.ts` continua funcionando no Next 16.3 (deprecada, com aviso no build, mas não removida) e aceita `runtime: "experimental-edge"` no `config` exportado — é o workaround documentado no próprio issue acima, e o único jeito de ter a renovação de sessão do `/admin` funcionando neste stack hoje.

**Não rode `npx @next/codemod middleware-to-proxy`** neste projeto sem antes verificar se `@opennextjs/cloudflare` passou a suportar Node.js middleware (procure "proxy" nas issues abertas do repositório). Se rodar por engano, o sintoma é exatamente o erro de build acima.

---

## Variáveis de ambiente/secrets — checklist completo

| Nome | Onde vive | Obrigatório | Usado por |
|---|---|---|---|
| `SUPABASE_URL` | secret | sim | `/api/leads`, `/api/keepalive`, `/api/backup-export`, `middleware.ts`, `/admin` |
| `SUPABASE_ANON_KEY` | secret | sim | `middleware.ts`, `/admin` (sessão do painel) |
| `SUPABASE_SERVICE_ROLE_KEY` | secret | sim | `/api/leads`, `/api/keepalive`, `/api/backup-export` |
| `KEEPALIVE_SECRET` | secret | sim | Cron diário → `/api/keepalive` |
| `BACKUP_EXPORT_SECRET` | secret | sim | Cron semanal → `/api/backup-export` |
| `TURNSTILE_SECRET_KEY` | secret | **sim** (sem ela o formulário nega tudo) | `/api/leads` (verificação anti-bot) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | **ambiente de BUILD** (não é secret nem `vars`) | **sim** | `app/components/BookingForm.tsx` (widget no navegador) |
| `RESEND_API_KEY` | secret | recomendado | `/api/leads` (aviso por e-mail) |
| `LEAD_NOTIFICATION_FROM` | secret | recomendado | idem |
| `LEAD_NOTIFICATION_TO` | secret | recomendado | idem |
| `NEXT_PUBLIC_SITE_URL` | `vars` (wrangler.jsonc) | sim | canonical/OG, link do painel no e-mail |
| `KEEPALIVE_ENDPOINT_PATH` | `vars` | não (tem default) | `workers/entry.ts` |
| `BACKUP_EXPORT_ENDPOINT_PATH` | `vars` | não (tem default) | `workers/entry.ts` |
| `LEAD_EMAIL_INCLUDE_HEALTH_DATA` | `vars` | não (default `false`) | `/api/leads` (decisão de compliance) |

Fonte de verdade de cada variável (o que é, onde obter o valor): `.env.example`.

---

## Cron Triggers

Dois, definidos em `wrangler.jsonc` (`triggers.crons`), ambos tratados por `workers/entry.ts` → `scheduled()`:

| Expressão | Quando (UTC / Brasília) | Chama | Por quê |
|---|---|---|---|
| `0 6 * * *` | Todo dia, 06:00 / 03:00 | `GET /api/keepalive` | O Supabase free pausa o projeto depois de 7 dias sem atividade. Diário (não semanal) deixa 6 tentativas de folga antes do prazo estourar caso uma execução falhe. |
| `10 6 * * 1` | Toda segunda, 06:10 / 03:10 | `GET /api/backup-export` | Ver "Backup e recuperação de dados" abaixo. Compensado 10 min do outro cron de propósito, para não competir no mesmo minuto. |

Os dois chamam o próprio Worker por **service binding** (`WORKER_SELF_REFERENCE` em `wrangler.jsonc`) — uma chamada interna, sem sair para a rede, sem depender de DNS/TLS estarem corretos, e sem precisar saber o domínio de produção. Cada rota exige o bearer token correspondente (`KEEPALIVE_SECRET`/`BACKUP_EXPORT_SECRET`) — sem o secret cadastrado, a rota nega com 503 (negar por padrão) e isso aparece no primeiro `wrangler tail` que alguém rodar, não silenciosamente.

**Como depurar um cron que não rodou**: painel Cloudflare → Workers & Pages → seu Worker → aba **Triggers** mostra as próximas execuções agendadas; aba **Logs** (ou `npx wrangler tail`) mostra os eventos `keepalive_cron_ok`/`keepalive_cron_falhou`/`backup_export_cron_ok`/etc. gerados por `workers/entry.ts`.

---

## Rate limiting: por que não KV

`app/lib/rate-limit.ts` (backend) deixou o limitador em memória por isolate — funciona contra bot burro martelando o mesmo endpoint, mas não é um limite distribuído de verdade em Workers, e deixou a interface `RateLimitStore`/`setRateLimitStore()` como ponto de injeção pronto para um KV ou Durable Object, se devops decidisse que valia a pena.

**Decisão: não vale, e não foi wireado.** Motivos, verificados contra a documentação atual da Cloudflare (não por lembrança):

1. **O free tier do KV tem um teto de 1.000 escritas por dia, por CONTA (todos os namespaces somados)** — não por namespace, não por endpoint (https://developers.cloudflare.com/kv/platform/limits/). O limite hoje configurado em `/api/leads` já permite 5 envios por IP a cada 10 min; um único IP insistindo no limite por um dia inteiro (144 janelas × 5 = até ~720 escritas) já consome boa parte da cota diária de TODA a conta sozinho — e qualquer coisa que se pareça com o ataque que o rate limit existe para conter (múltiplos IPs, ou um bot mais paciente) estoura os 1.000 escritos/dia rapidamente. Nesse momento o KV passa a **recusar escrita** — ou seja, o próprio mecanismo de defesa quebra durante um ataque, exatamente o momento em que mais precisa funcionar. É um penhasco, não uma rampa, e ele fica embaixo do pé bem onde o ataque aconteceria.
2. **KV é eventualmente consistente** (propagação global pode levar até ~60s) — um atacante distribuído por vários data centers furaria o limite dentro dessa janela de propagação de qualquer forma, então nem resolve por completo o problema que o rate limit em memória já tem hoje (isolates diferentes = contadores diferentes).
3. **O verdadeiro problema não é "quanto custa" — é "o que sobra depois".** Nenhum provedor desta stack cobra por estourar cota no plano free (Supabase, Resend e Workers recusam/degradam, não faturam — ver comentário original em `rate-limit.ts`). O prejuízo real de um flood é lixo no banco de leads (dado de saúde) e cota de e-mail do Resend queimada. Contra isso, o remédio certo é resolver na origem ("isto é um bot?") em vez de contar requisições: **Cloudflare Turnstile**. **Isto agora está implementado** — ver a seção abaixo. O rate limit em memória continua onde está, como primeira camada barata contra duplo-clique e bot burro; ele deixou de ser a única linha de defesa.

Se o volume de leads um dia justificar um limitador realmente distribuído mesmo com o Turnstile no lugar, a interface `RateLimitStore` continua pronta para receber uma implementação em Durable Object (consistência forte, ao contrário do KV) — mas isso é passo posterior, não recomendado agora para um site recém-lançado sem tráfego real ainda.

---

## Cloudflare Turnstile (o portão anti-bot do formulário)

**Sem isto configurado, o formulário do site não aceita nenhum envio em produção.** É deliberado — leia até o fim antes de "consertar".

### O que é e por que existe

O `/api/leads` já tinha content-type check, rate limit por IP, teto de corpo, honeypot `_gotcha` e validação server-side. A revisão de segurança mostrou que nada disso segura o caso que importa: um script que monta o JSON "na mão" pula o honeypot (que só pega bot que preenche todo campo do HTML) e fura o rate limit (best-effort em Workers — isolates separados, e trocar de IP zera). Consequência concreta e verificada: cada envio aceito dispara um e-mail via Resend, cujo plano free corta por volta de **100 e-mails/dia**. Ou seja, ~100 requisições roteirizadas queimam a cota do dia e, a partir dali, **lead de paciente real não gera aviso nenhum, sem ninguém perceber** — e o painel `/admin/leads` (sem paginação nem busca, por decisão de escopo) fica soterrado de linhas falsas empurrando os leads reais para fora da tela.

Turnstile foi escolhido em vez de um limitador distribuído porque ataca a pergunta certa ("tem uma pessoa num navegador do outro lado?"), é gratuito, e vive na **mesma conta Cloudflare que já hospeda o Worker** — nenhum fornecedor novo entra no fluxo, o que importa aqui porque este formulário trata dado de saúde (LGPD art. 11) e cada terceiro a mais é uma conversa de compliance a mais.

Código: `app/lib/turnstile.ts` (verificação server-side), `app/components/TurnstileWidget.tsx` (widget), `app/api/leads/route.ts` (ordem das checagens).

### Criar o widget (passo manual do dono do site)

1. Painel Cloudflare → **Turnstile** → **Add widget**.
2. Nome: qualquer coisa (ex. `clinac-site`).
3. **Hostnames**: o domínio do site. Acrescente `localhost` se quiser testar com a chave real na sua máquina (para o dia a dia isso não é necessário — ver "Dev local" abaixo).
4. **Widget Mode: Managed**. É o recomendado: a Cloudflare decide sozinha quem passa direto (a maioria vê só um "verificado" aparecer em ~1 s) e quem recebe um desafio.
5. **Create**. A tela mostra as duas chaves:
   - **Site Key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (pública)
   - **Secret Key** → `TURNSTILE_SECRET_KEY` (segredo)

### As duas chaves vão para lugares DIFERENTES — e é aqui que dá errado

| | Onde vai | Por quê |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | `npx wrangler secret put TURNSTILE_SECRET_KEY` | É credencial. Lida só em tempo de requisição, no servidor. Mesma régua da `service_role`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | **ambiente que roda `next build`** | É pública por definição do produto (a Cloudflare a chama de *"public key used to invoke the Turnstile widget on your site"*) — ela **precisa** estar no HTML para o widget existir. |

**A armadilha**: variáveis `NEXT_PUBLIC_*` são **inlinadas pelo Next em tempo de build**, não lidas em runtime. Cadastrar a sitekey como `wrangler secret` ou como `vars` no `wrangler.jsonc` **não faz ela chegar ao navegador** — o build já terminou. O sintoma é silencioso e enganoso: o site sobe, a página abre, o widget simplesmente não aparece, e todo envio é recusado.

Para o deploy pelo CI, a sitekey é uma **GitHub Actions *variable*** (não um *secret*): repositório → Settings → Secrets and variables → Actions → aba **Variables** → New variable → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. O workflow já a repassa para os passos de build (`.github/workflows/ci.yml`). Para um deploy manual da sua máquina (`npm run deploy`), basta ela estar no `.env.local`.

### Postura na ausência de configuração: NEGAR

Sem `TURNSTILE_SECRET_KEY` em produção, `/api/leads` responde **503** e não grava nem notifica nada. Não é bug: deixar passar recriaria em silêncio exatamente o buraco que o Turnstile fecha, e "em silêncio" é a parte pior — ninguém descobriria até a cota de e-mail queimar de novo.

O que o visitante vê nesse cenário é uma mensagem apontando o **WhatsApp**, que continua funcionando e é o canal preferido da clínica de qualquer forma. Ou seja: o pior caso de "esqueci de configurar" é perder o formulário, não perder o contato.

**Como confirmar que está tudo certo depois do deploy**: abra o site, veja o widget aparecer acima do botão "Solicitar avaliação" e faça um envio de teste. Se ele falhar, `npx wrangler tail` mostra qual é o caso:

| Evento no log | Significa |
|---|---|
| `turnstile_nao_configurado` | falta o `wrangler secret put TURNSTILE_SECRET_KEY`. O campo `sitekey_presente` no mesmo log diz se você cadastrou só metade do par. |
| `lead_turnstile_reprovado` | o desafio existiu e foi reprovado (token vencido, replayado, hostname do widget diferente do domínio do site). |
| `lead_turnstile_indisponivel` | não foi possível falar com o `siteverify` da Cloudflare. |

### Modo de falha: `siteverify` fora do ar

Se o endpoint de verificação da Cloudflare ficar inalcançável, a rota **recusa** os envios (503) em vez de deixar passar — mesma postura de negar por padrão do resto do projeto, e o custo de errar para o outro lado é assimétrico. O que segura o prejuízo é o desenho da página (a mensagem aponta o WhatsApp), não o código. Se algum dia o log `lead_turnstile_indisponivel` aparecer com frequência que incomode, a conversa a ter é *"aceitar o envio mas não disparar o e-mail"* — e não *"aceitar tudo"*, que joga fora a proteção inteira.

### Dev local: chaves de teste, sem precisar de conta

A Cloudflare publica [chaves de teste oficiais](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) que sempre aprovam (ou sempre reprovam, se você quiser exercitar o caminho de erro). O `.env.example` já vem com o par "always passes" como valor padrão, então `npm run dev`, `npm test` e `npm run preview` funcionam sem nenhuma conta Turnstile. Elas não enfraquecem produção: a sitekey de teste gera o token fictício `XXXX.DUMMY.TOKEN.XXXX`, que uma secret key de verdade **rejeita**.

Fora de produção, se as variáveis estiverem ausentes, o código cai nessas mesmas chaves de teste e registra um aviso barulhento (`turnstile_chave_de_teste`). Esse fallback **nunca** vale em produção — lá, ausência de chave nega.

### O que isto NÃO resolve

Turnstile encarece muito o abuso automatizado; não o torna impossível (existem serviços pagos de resolução de desafio). Contra um atacante determinado e disposto a pagar, o que continua valendo é o resto: rate limit por IP, teto de corpo, validação de campo e o fato de o painel `/admin` só ser legível por quem está em `admin_users`. E vale lembrar o que já estava registrado neste documento: nenhum provedor desta stack **fatura** por estourar cota no plano free — o prejuízo de um abuso é indisponibilidade e lixo no banco, não uma conta a pagar.

---

## Backup e recuperação de dados

### O que o Supabase faz sozinho: nada, neste plano

Confirmado contra a documentação atual do Supabase (https://supabase.com/docs/guides/platform/backups, atualizada nesta mesma consulta): **backup automático diário só existe nos planos Pro, Team e Enterprise.** O plano free usado por este projeto **não tem nenhum backup automático** — nem diário, nem via Point-in-Time Recovery. A própria documentação do Supabase recomenda que projetos free façam exportação manual regular. Ou seja: hoje, sem a rota abaixo, a única cópia dos leads é a linha na tabela em produção — reverter um deploy não desfaz uma migração ruim, um `DELETE` sem `WHERE`, ou um bug que rodou por um dia. Nada disso é código.

### O que foi montado: exportação semanal para R2

`app/api/backup-export/route.ts` (nova rota, chamada pelo cron semanal acima): lê `select * from leads`, grava um JSON (`{ gerado_em, total, linhas }`) no bucket R2 `BACKUPS_BUCKET` (`clinac-odontologia-backups`, criado no passo 2 do primeiro deploy), e apaga os dumps mais antigos além dos 8 mais recentes (~2 meses de histórico, rotativo).

**Por que R2 e não e-mail.** Mandar o dump por Resend seria mais simples de configurar, mas copiaria dado de saúde (LGPD art. 11 — o campo `tratamento`) para mais um terceiro (os servidores do Resend) e para a caixa postal da clínica, de forma automática e recorrente — exatamente a mesma categoria de decisão que `app/lib/notify.ts` já deixa explicitamente para compliance decidir para um único lead por vez (`LEAD_EMAIL_INCLUDE_HEALTH_DATA`). Fazer isso sozinho para o banco inteiro, toda semana, sem essa conversa, não é uma decisão de infraestrutura. R2 fica dentro da mesma conta Cloudflare que já é confiada com os secrets do Worker — não introduz um novo terceiro nem uma nova transferência internacional a mais do que já existe.

**Custo.** Gratuito com folga: R2 free = 10 GB de armazenamento e 1M operações de escrita + 10M de leitura por mês; um dump semanal de uma tabela de leads deste porte (algumas dezenas/centenas de linhas) fica na casa de poucos KB a poucas centenas de KB por arquivo, e a rotação para 8 arquivos mantém o total sempre pequeno.

**Retenção: 8 backups, decidido por compliance em 2026-08-14.** O prazo de retenção dos leads foi fixado em **12 meses** (`PRIVACIDADE.md` v2.0, seção 5; consulta de expurgo em `supabase/data-subject-requests.sql`, item 5). Isso **não** significa subir `RETENCAO_MAX_BACKUPS` para 52: o backup existe para recuperar de falha técnica recente, não para arquivar, e guardar um ano de cópias de dado de saúde multiplicaria a superfície de vazamento sem finalidade adicional. Os 8 dumps (~2 meses) são a janela **declarada aos titulares** na política — mexer no número exige atualizar aquele texto no mesmo commit.

**Região do bucket R2 — pendência de compliance para o dono do site.** A Cloudflare **não oferece região na América do Sul para R2**: os *location hints* disponíveis são América do Norte (leste/oeste), Europa (oeste/leste), Ásia-Pacífico e Oceania, e as únicas jurisdições restritas são `eu` e `fedramp` (https://developers.cloudflare.com/r2/reference/data-location/). Consequência concreta: **mesmo que o banco Supabase seja criado em São Paulo, a cópia de segurança semanal — que contém o campo `tratamento`, dado de saúde — fica armazenada fora do Brasil.** Isso é transferência internacional e está declarado em `PRIVACIDADE.md` §4.1, mas a **região efetiva do bucket precisa ser confirmada e preenchida na política antes de publicar**. Se o bucket foi criado com o padrão "Automatic", a Cloudflare escolheu a região mais próxima de quem rodou `wrangler r2 bucket create` — confirme no painel (R2 → bucket → Settings) qual foi, não presuma.

**Um pedido de exclusão (LGPD art. 18, VI) não apaga isto sozinho.** Apagar um lead de `public.leads` (processo manual em `supabase/data-subject-requests.sql`) não remove cópias já gravadas em backups anteriores dentro da janela de retenção. Quem processar um pedido de exclusão precisa também abrir os backups dos últimos ~2 meses no R2 e remover a linha correspondente manualmente — não existe automação para isso hoje, de propósito (mesma régua de "exclusão exige uma pessoa olhando" já usada no resto do projeto).

### Restore — procedimento manual (nunca testado contra um projeto real, porque não existe ainda)

Não existe rota de restore automática, de propósito — restaurar é raro e de alto risco (pode sobrescrever dado mais novo com um dump velho), então deve exigir uma pessoa olhando.

1. **Baixar o dump**: painel Cloudflare → R2 → bucket `clinac-odontologia-backups` → objeto `leads/<data>.json` → Download. Ou via CLI: `npx wrangler r2 object get clinac-odontologia-backups/leads/<data>.json --file=dump.json`.
2. **Conferir o conteúdo** antes de tocar no banco — é um JSON com `{ gerado_em, total, linhas: [...] }`, cada item de `linhas` é uma linha de `leads` no formato de coluna do Postgres.
3. **Restaurar** (SQL Editor do Supabase), linha por linha ou em lote via `insert into public.leads select * from jsonb_populate_recordset(null::public.leads, '<cole o array "linhas" aqui>'::jsonb) on conflict (id) do nothing;` — o `on conflict do nothing` evita sobrescrever uma linha que já exista com um valor mais novo.
4. **Nunca rodado contra um projeto real** (não existe ainda um projeto Supabase de produção deste site neste momento) — antes de confiar neste passo a passo num incidente de verdade, vale um teste manual único num projeto de teste, uma vez, e anotar aqui o resultado.

### Alternativa sem R2 (exportação manual, já existia)

`supabase/data-subject-requests.sql`, consulta 4, ou painel → Table Editor → `leads` → Export → CSV — já deixado pelo backend, continua válido como exportação ad-hoc a qualquer momento (ex.: antes de uma migração de schema).

---

## Rollback

**Rollback de código é rápido e não depende de rebuild:**

```bash
npx wrangler deployments list        # lista as últimas versões publicadas
npx wrangler rollback [ID-DA-VERSAO] # sem argumento, volta para a anterior
```

Leva segundos — a Cloudflare mantém as versões anteriores do Worker já publicadas, então não é preciso rodar o build de novo. Isso cobre "o deploy de agora quebrou algo" (bug de código, variável de ambiente esquecida, etc.).

**Rollback de código não desfaz rollback de dado.** Um `wrangler rollback` restaura qual versão do Worker está servindo — não desfaz uma migração de banco ruim, um `UPDATE`/`DELETE` sem `WHERE`, nem um bug que gravou lixo por um dia. Para isso, ver "Backup e recuperação de dados" acima. As duas coisas são independentes: o código pode voltar ao normal enquanto o banco continua com o estrago.

**Migração de banco não tem rollback automático.** `supabase/migrations/` não tem script de "descer" (down) — de propósito, ver comentário no topo do arquivo de migração. Reverter uma migração de schema é manual, no SQL Editor, e deve ser feito com um backup em mãos (ver seção de backup acima) antes de mexer.

---

## Monitoramento / uptime / erros

- **Workers Logs** (`observability.enabled: true` em `wrangler.jsonc`, já ligado): todo `console.log`/`console.error` das rotas e do `workers/entry.ts` aparece no painel (Workers & Pages → seu Worker → Logs) e via `npx wrangler tail` em tempo real. Retenção no plano free: **3 dias** (confirmado contra a documentação atual de pricing da Cloudflare — no plano Paid sobe para 7 dias). As rotas já logam em JSON estruturado (`evento: "lead_criado"`, `"keepalive_cron_falhou"`, `"backup_export_cron_ok"`, etc.) — é o que dá para investigar um incidente sem precisar reproduzir localmente, mas só dentro dessa janela de 3 dias.
- **Sem alerta push nativo de erro configurado** — o plano free da Cloudflare não oferece um "me avise por e-mail quando aparecer um 500" pronto para este projeto (as categorias de alerta de tráfego/erro da Cloudflare — Traffic Monitoring, Advanced Error Rate Alert — exigem plano Enterprise). O mínimo funcional recomendado, gratuito, é um checador de uptime externo apontando para a home pública (ex. [UptimeRobot](https://uptimerobot.com) ou [Better Uptime](https://betteruptime.com), ambos com plano free — checagem a cada 5 min, alerta por e-mail se a home cair). **Isto não foi cadastrado nesta rodada** porque exige criar conta em mais um serviço de terceiro — mesma restrição de "não posso criar conta em nome do dono do site" que vale para Supabase/Resend/Cloudflare. Ficou pendente: o dono do site precisa criar a conta e apontar para a URL de produção.
- **DDoS/abuso**: Notifications → **HTTP DDoS Attack Alert** (Cloudflare, painel → Notifications → Add), disponível em todos os planos, gratuito — dispara quando a Cloudflare mitiga um ataque acima de 100 requisições/segundo. Não é específico deste site, mas é real, automático e não exige configuração de threshold.

---

## Alertas de custo/uso — o que existe de verdade e o que não existe

Sendo preciso, porque "recebi um e-mail de aviso" e "o sistema não deixa passar de X" são coisas bem diferentes:

- **Cloudflare Workers (requisições) — trava automática real, não é alerta**: o plano Free tem um teto rígido de **100.000 requisições/dia**. Passado isso, requisições adicionais são recusadas pela própria plataforma — não vira cobrança (o plano Free não tem cartão associado por padrão), vira indisponibilidade. Para o volume esperado de um site institucional de clínica local, esse teto está anos-luz de distância do tráfego real — mas é bom saber que ele existe como uma trava, não como um aviso: **não há e-mail avisando que o site está se aproximando do teto**, só o sintoma (visitante vendo erro) se algum dia for atingido.
- **Cloudflare R2 (o bucket de backup) — sem trava automática, e o alerta "oficial" pode nem estar disponível neste plano**: R2 é cobrado por uso acima do free tier *se* houver um método de pagamento cadastrado na conta (necessário para habilitar R2 mesmo para uso 100% gratuito — ver passo 2 do primeiro deploy). A partir do momento em que existe cartão cadastrado, uma eventual explosão de uso *seria* cobrada — não existe um "corta o serviço automaticamente ao estourar o orçamento" nativo da Cloudflare para R2. O tipo de notificação que mais se aproxima disso ("Usage Based Billing", que avisa por e-mail ao cruzar um limite escolhido) **exige plano de zona Professional ou superior** — este projeto, sem domínio próprio configurado na Cloudflare ainda, provavelmente nem tem essa opção disponível. Na prática, o que protege este projeto de uma conta de R2 fora de controle não é um alerta — é o desenho: a única escrita em R2 é `/api/backup-export`, protegida por bearer secret, chamada só pelo cron semanal, escrevendo um arquivo pequeno e rotacionando para 8. Não há caminho de abuso externo que gere volume ali. Ainda assim: **recomendação para o dono do site** — dê uma olhada de vez em quando em painel Cloudflare → Billing → Usage (gratuito, sempre disponível, sem alerta automático) só para confirmar que continua em zero.
- **Supabase / Resend (free)**: como o próprio `rate-limit.ts` já registra, os dois recusam/degradam ao estourar cota do plano free — não faturam automaticamente sem upgrade manual do dono da conta. Não existe alerta proativo nativo do Supabase no plano free para "spike de escrita". A defesa real contra o padrão de abuso mais provável (flood de envios de formulário) é o **Cloudflare Turnstile** (seção própria acima), verificado **antes** de qualquer e-mail ser disparado — precisamente porque a cota que queima primeiro é a do Resend (~100 e-mails/dia), e queimá-la significa parar de receber aviso de lead **real**. Rate limit por IP e honeypot continuam como camadas baratas na frente dele, não como a defesa principal.
- **Criação de conta (Supabase Auth)**: o painel Supabase → Authentication → Sign In/Providers → "Allow new users to sign up" precisa estar **desligado** (a allowlist `admin_users` já impede leitura de dado mesmo com cadastro aberto, mas desligar evita lixo em `auth.users`) — passo manual já deixado pelo backend em `supabase/migrations/20260814120000_leads.sql`, seção 5. **Confirmar que este passo foi feito** é a defesa real contra "spike de criação de conta"; não há alerta Cloudflare-side para isso, porque não é um recurso da Cloudflare.

Resumindo para quem só quer a resposta direta: **a única trava verdadeiramente automática nesta stack é o teto de 100k req/dia do Workers Free — o resto é ou "recusa sem cobrar" (Supabase/Resend), ou "sem trava mas com uso desenhado para nunca chegar perto" (R2), ou "depende de um passo manual que precisa ser confirmado" (desligar cadastro público no Supabase Auth).**

---

## Domínio, DNS e TLS

**Ainda não aplicável — nenhum domínio real foi confirmado.** `NEXT_PUBLIC_SITE_URL` em `wrangler.jsonc` continua com o placeholder `https://www.seudominio.com.br` (mesmo usado em `.env.example`). Quando o dono do site decidir/comprar o domínio da clínica, os passos são:

1. **Adicionar o domínio à Cloudflare** (se ainda não estiver lá) — painel → Add a Site → seguir o fluxo de trocar os nameservers no registrador. A Cloudflare emite TLS automaticamente para o domínio (Universal SSL, gratuito, renovação automática — não exige nada manual depois de configurado).
2. **Custom Domain do Worker** — painel → Workers & Pages → este Worker → Settings → Domains & Routes → Add Custom Domain → `www.dominio.com.br` (e/ou o apex `dominio.com.br`). A Cloudflare cria o registro DNS e o certificado TLS automaticamente ao vincular.
3. **Redirecionamento apex ↔ www** — decidir qual é o canônico (recomendação: `www.dominio.com.br`, já é o que `NEXT_PUBLIC_SITE_URL` assume) e configurar uma Bulk Redirect Rule (gratuita, painel → Rules → Redirect Rules) do outro para o canônico. Sem isso, o site "funciona pela metade": alguém que digitar sem o `www` (ou com, se for o contrário) não cai em lugar nenhum ou cai numa versão não-canônica sem redirecionar.
4. **Atualizar `NEXT_PUBLIC_SITE_URL`** em `wrangler.jsonc` (`vars`) para o domínio real, e redeployar.
5. **Atualizar o domínio do Resend** (`.env.example`, seção Resend) para o mesmo domínio, se ainda não estiver — os registros SPF/DKIM do Resend são por domínio.

Documentar aqui **o que aponta para onde**, para o mantenedor solo não precisar reconstruir esse contexto: depois do passo 2, o domínio aponta para o Worker via o binding de Custom Domain (não é um CNAME manual que alguém precise lembrar de renovar) — TLS é gerenciado pela Cloudflare automaticamente enquanto o domínio permanecer na conta Cloudflare com o Custom Domain vinculado.

---

## Onde o Worker roda de verdade (nota para `compliance`)

Cloudflare Workers executa **na borda, globalmente** — não existe uma "região" fixa como acontece com uma instância de servidor tradicional ou uma função serverless regional. Uma requisição de um visitante em Belo Horizonte é processada pelo data center da Cloudflare mais próximo dele (tipicamente já no Brasil), não por um servidor central único. Isso é uma característica de arquitetura do produto, não uma configuração que este projeto liga/desliga.

**Relevância para a análise de LGPD/consentimento**: o Worker em si não *armazena* nada — ele processa a requisição e fala com o Supabase (banco, região a confirmar — ver pendência do backend para São Paulo/`sa-east-1`) e opcionalmente com o Resend/R2. O dado em repouso continua vivendo onde esses serviços vivem, não "no Worker". Mas o *processamento* (o código que lê o formulário, valida, decide o que fazer) roda em múltiplos pontos geograficamente distribuídos globalmente por definição do produto — isso é uma informação diferente de "onde o banco fica" e pode ser relevante para o texto de consentimento/política de privacidade descrever com precisão onde/como o dado é *processado* versus onde é *armazenado*.

**Resposta de compliance (2026-08-14)**: sim, muda — e já foi incorporado. `PRIVACIDADE.md` v2.0 passou a separar explicitamente **execução/processamento** (Cloudflare Workers, rede global, sem região fixa — seção 2.2, item 1) de **armazenamento** (Supabase, seção 4.1), e a listar Workers, R2 e Turnstile como três entradas distintas na tabela de operadores, porque as três têm perfis de localização diferentes. Duas consequências que continuam **abertas e bloqueiam a publicação da política**: (a) a **região do projeto Supabase** precisa ser escolhida — a política traz duas redações alternativas e não pode ir ao ar com as duas; (b) a **região do bucket R2** precisa ser confirmada (ver "Backup e recuperação de dados" acima).

---

## Local: dev, preview e diferenças

- **`npm run dev`** (`next dev`) — o dia a dia normal, nada muda. Lê `.env.local` (não versionado — copie de `.env.example`). Graças a `initOpenNextCloudflareForDev()` em `next.config.ts`, os bindings do Worker (ex. o service binding de auto-referência) ficam disponíveis mesmo aqui, do jeito mais parecido possível com produção.
- **`npm run preview`** (`opennextjs-cloudflare build && opennextjs-cloudflare preview`) — builda e roda o Worker de verdade, dentro do runtime `workerd` (o mesmo da produção), na sua máquina. Mais fiel que `next dev`, mais lento para iterar. Lê `.dev.vars` (não versionado, ver comentário no próprio arquivo) em vez de `.env.local` — para testar `/api/leads`, `/api/keepalive`, `/api/backup-export` ou `/admin` neste modo, copie os mesmos nomes/valores de `.env.local` para `.dev.vars`.
- **`npm run build:worker`** (`opennextjs-cloudflare build`) — só builda, não sobe nem roda nada. É o que a CI usa para validar que o empacotamento para Cloudflare não quebrou, e é pré-requisito de `deploy`/`preview`/`upload`.

---

## Por que não staging

Um ambiente de staging separado (segundo Worker, segundo projeto Supabase, segunda pipeline) foi deliberadamente **não** montado. Para um MVP ainda sem usuários reais, mantido por uma pessoa, um segundo ambiente completo é manutenção duplicada (duas vezes as migrações para aplicar, duas vezes os secrets para manter sincronizados, duas vezes a chance de "funciona no staging mas não em produção" por causa de uma diferença esquecida entre os dois) sem um ganho proporcional — o `verify` do CI já pega a esmagadora maioria dos problemas (erro de tipo, build quebrado, lint) antes de qualquer deploy, e `npm run preview` cobre "rodar num ambiente Workers de verdade" localmente. Se o volume de leads/mudanças crescer a ponto de precisar testar uma mudança arriscada (ex. uma migração de schema) contra dado real antes de ir para produção, aí sim vale reconsiderar — não antes.
