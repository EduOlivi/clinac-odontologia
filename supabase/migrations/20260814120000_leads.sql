-- ============================================================================
-- Clínac Odontologia — migração 0001: tabela `leads` + RLS
-- ============================================================================
-- Como aplicar (escolha um):
--   a) Painel do Supabase → SQL Editor → cole este arquivo inteiro → Run
--   b) CLI: `supabase db push` (com este repo linkado ao projeto)
--
-- Este arquivo é idempotente o suficiente para ser re-executado em um projeto
-- novo, mas NÃO é um "migrate down" — não apague a tabela em produção sem
-- exportar os dados antes (ver supabase/data-subject-requests.sql).
--
-- POSTURA DE SEGURANÇA (não negociável neste projeto)
-- ---------------------------------------------------
-- A versão anterior deste site postava o formulário direto num endpoint
-- público (Formspree) que qualquer pessoa podia chamar. A migração para
-- Supabase existe justamente para acabar com essa classe de problema, então
-- aqui o padrão é NEGAR TUDO e abrir só o estritamente necessário:
--
--   * `anon` (chave pública, a que um dia poderia vazar num bundle):
--     ZERO grants e ZERO policies. Não lê, não escreve, não conta linhas.
--     Nem existe caminho de INSERT público — quem insere é a rota
--     /api/leads no servidor, usando a chave `service_role`.
--   * `authenticated`: só SELECT e só UPDATE da coluna `status`, e mesmo
--     assim apenas se o usuário estiver na allowlist `admin_users`.
--     "Estar logado" NÃO é autorização — ver comentário em admin_users.
--   * `service_role`: tem BYPASSRLS por definição no Supabase. Por isso essa
--     chave só pode existir no servidor (rota /api/leads e /api/keepalive),
--     nunca num componente de cliente, nunca numa var NEXT_PUBLIC_*.
-- ============================================================================

-- gen_random_uuid() — no Supabase a extensão já vem habilitada, mas deixamos
-- explícito para o caso de um projeto criado do zero em outro lugar.
create extension if not exists pgcrypto with schema extensions;


-- ----------------------------------------------------------------------------
-- 1) Tabela de leads
-- ----------------------------------------------------------------------------
-- Modelagem deliberadamente rasa: uma tabela só, sem normalizar `tratamento`
-- numa tabela de domínio e sem tabela de histórico de status. O volume
-- esperado é de dezenas a poucas centenas de leads por mês numa clínica
-- local; um JOIN a mais aqui não compra nada e custa complexidade de leitura.
-- Se um dia existir relatório por tratamento ou auditoria de mudança de
-- status, aí sim vale extrair.
create table if not exists public.leads (
  id                       uuid        primary key default gen_random_uuid(),
  created_at               timestamptz not null default now(),
  atualizado_em            timestamptz not null default now(),

  -- Dados do formulário (contrato de POST /api/leads, ver app/api/leads/route.ts)
  nome                     text        not null,
  telefone                 text        not null,
  melhor_horario           text,                    -- opcional no formulário
  tratamento               text        not null,    -- DADO DE SAÚDE (LGPD art. 11)

  -- Consentimento
  consentimento_lgpd       boolean     not null,
  consentimento_marketing  boolean     not null default false,
  politica_versao          text        not null,    -- qual versão da política foi aceita

  -- Ciclo de vida do lead (o "painel simples" do escopo acordado)
  status                   text        not null default 'novo',

  -- ---- Validação no banco (defesa em profundidade) ----
  -- A rota /api/leads já valida tudo isso antes de inserir. Repetimos aqui
  -- porque a rota é UM caller — um script de importação, um colega no SQL
  -- Editor ou uma rota futura não passam pela mesma validação, e a chave
  -- service_role ignora RLS mas NÃO ignora CHECK constraint.
  constraint leads_consentimento_lgpd_obrigatorio
    check (consentimento_lgpd is true),

  constraint leads_status_valido
    check (status in ('novo', 'contatado', 'agendado', 'compareceu')),

  -- Limites de tamanho: impedem que um bot encha os 500 MB do plano free
  -- com um "nome" de 10 KB. Os mesmos números estão em app/lib/leads.ts —
  -- se mudar aqui, mude lá (e vice-versa).
  constraint leads_nome_tamanho
    check (char_length(nome) between 2 and 120),
  constraint leads_telefone_tamanho
    check (char_length(telefone) between 8 and 40),
  constraint leads_melhor_horario_tamanho
    check (melhor_horario is null or char_length(melhor_horario) <= 120),
  constraint leads_tratamento_tamanho
    check (char_length(tratamento) between 2 and 80),
  constraint leads_politica_versao_tamanho
    check (char_length(politica_versao) between 1 and 80)
);

comment on table public.leads is
  'Pedidos de avaliação enviados pelo formulário do site. Contém DADO PESSOAL SENSÍVEL (tratamento de interesse = dado de saúde, LGPD art. 11). Nenhum acesso público: escrita só via service_role na rota /api/leads; leitura só para usuários na allowlist admin_users.';
comment on column public.leads.tratamento is
  'Dado de saúde (LGPD art. 11). Não replicar em logs, analytics ou e-mails sem decisão de compliance.';
comment on column public.leads.politica_versao is
  'Versão da Política de Privacidade aceita no momento do envio — rastreabilidade do consentimento se a política mudar.';

-- Único padrão de acesso real do painel: "os leads mais recentes primeiro".
-- Com algumas centenas de linhas o Postgres nem usaria o índice; ele está
-- aqui porque é barato e porque é o índice que sobrevive ao crescimento.
create index if not exists leads_created_at_desc_idx
  on public.leads (created_at desc);

-- Deliberadamente NÃO criado: índice por `status`. Filtrar 300 linhas em
-- memória é mais rápido que manter um índice. Criar quando/se o painel
-- ganhar filtro e a tabela passar de alguns milhares de linhas.


-- ----------------------------------------------------------------------------
-- 2) Trigger de `atualizado_em`
-- ----------------------------------------------------------------------------
-- Serve para responder "quando esse lead foi marcado como contatado?" sem
-- precisar de uma tabela de histórico.
create or replace function public.tg_leads_set_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists leads_set_atualizado_em on public.leads;
create trigger leads_set_atualizado_em
  before update on public.leads
  for each row execute function public.tg_leads_set_atualizado_em();


-- ----------------------------------------------------------------------------
-- 3) Allowlist de quem é "equipe da clínica"
-- ----------------------------------------------------------------------------
-- POR QUE ISSO EXISTE: uma policy `to authenticated using (true)` pareceria
-- suficiente, mas o Supabase Auth aceita cadastro público por padrão — ou
-- seja, qualquer pessoa na internet criaria uma conta e passaria a LER TODOS
-- OS LEADS (nome, telefone e dado de saúde). Autenticação ("é um usuário
-- logado?") e autorização ("esse usuário pode ver ISSO?") são duas perguntas
-- diferentes; esta tabela responde a segunda.
--
-- Continua valendo desligar o cadastro público no painel
-- (Authentication → Sign In / Providers → "Allow new users to sign up" = OFF),
-- mas o site não depende dessa configuração para estar seguro.
create table if not exists public.admin_users (
  user_id     uuid        primary key references auth.users (id) on delete cascade,
  email       text,
  criado_em   timestamptz not null default now()
);

comment on table public.admin_users is
  'Allowlist de contas com acesso ao painel /admin/leads. Gerenciada à mão pelo dono do projeto (SQL Editor) — não há tela de convite, de propósito.';

-- SECURITY DEFINER: a policy de `leads` precisa consultar `admin_users`, mas
-- essa consulta rodaria como o próprio usuário e esbarraria na RLS de
-- admin_users (ou recursão). A função roda com o dono da função e resolve
-- isso. `set search_path = ''` + nomes qualificados evitam o ataque clássico
-- de sequestro de search_path em função SECURITY DEFINER.
create or replace function public.is_clinic_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_clinic_staff() from public;
grant execute on function public.is_clinic_staff() to authenticated;


-- ----------------------------------------------------------------------------
-- 4) RLS — negar por padrão
-- ----------------------------------------------------------------------------
alter table public.leads       enable row level security;
alter table public.admin_users enable row level security;

-- FORCE: aplica RLS até para o dono da tabela. Papéis com BYPASSRLS
-- (`service_role`, `postgres`) continuam passando — é assim que a rota
-- /api/leads insere.
alter table public.leads       force row level security;
alter table public.admin_users force row level security;

-- O Supabase concede, por default privileges, SELECT/INSERT/UPDATE/DELETE a
-- `anon` e `authenticated` em toda tabela nova do schema public. RLS já
-- barraria, mas grant é a camada de baixo: sem grant, nem uma policy escrita
-- errado no futuro abre a tabela. Tiramos tudo e devolvemos só o necessário.
revoke all on public.leads       from anon, authenticated;
revoke all on public.admin_users from anon, authenticated;

-- `anon` (chave pública): nada. Nenhum grant, nenhuma policy.
--   -> PostgREST responde 401/403 para qualquer tentativa. É o objetivo.

-- `authenticated`: lê tudo, mas só pode escrever na coluna `status`.
-- O grant por coluna é o que impede o painel (ou uma sessão roubada de
-- alguém da equipe) de reescrever nome/telefone/consentimento de um lead —
-- a policy de UPDATE sozinha não limitaria QUAIS colunas mudam.
grant select          on public.leads to authenticated;
grant update (status) on public.leads to authenticated;
grant select          on public.admin_users to authenticated;

drop policy if exists "staff le todos os leads" on public.leads;
create policy "staff le todos os leads"
  on public.leads
  for select
  to authenticated
  using ( (select public.is_clinic_staff()) );

drop policy if exists "staff atualiza status do lead" on public.leads;
create policy "staff atualiza status do lead"
  on public.leads
  for update
  to authenticated
  using      ( (select public.is_clinic_staff()) )
  -- WITH CHECK protege a linha DEPOIS do update: sem isso, um staff poderia
  -- gravar um status fora do ciclo acordado (o CHECK constraint já barraria,
  -- mas aqui a intenção fica declarada junto da policy).
  with check ( (select public.is_clinic_staff())
               and status in ('novo', 'contatado', 'agendado', 'compareceu') );

-- Sem policy de INSERT e sem policy de DELETE para `authenticated`:
--   * INSERT de lead é sempre server-side, via service_role (/api/leads).
--   * DELETE (direito de eliminação, LGPD art. 18 VI) é processo manual e
--     registrado — ver supabase/data-subject-requests.sql. Apagar dado de
--     titular não deve ser um botão a um clique de distância num painel sem
--     trilha de auditoria.

drop policy if exists "usuario le a propria linha de staff" on public.admin_users;
create policy "usuario le a propria linha de staff"
  on public.admin_users
  for select
  to authenticated
  using ( (select auth.uid()) = user_id );


-- ----------------------------------------------------------------------------
-- 5) Passo manual pós-migração (o dono do site precisa fazer)
-- ----------------------------------------------------------------------------
-- 1. Painel → Authentication → Users → "Add user" → e-mail + senha da equipe
--    (marque "Auto Confirm User", senão o login fica pendente de e-mail).
-- 2. Rode, trocando o e-mail:
--
--      insert into public.admin_users (user_id, email)
--      select id, email from auth.users where email = 'equipe@clinac.com.br'
--      on conflict (user_id) do nothing;
--
-- 3. Painel → Authentication → Sign In / Providers → desligue
--    "Allow new users to sign up" (a allowlist acima já protege os dados,
--    isso só evita lixo na tabela auth.users).
--
-- Sem o passo 2, o login funciona mas /admin/leads mostra "sem permissão" —
-- comportamento correto de negar-por-padrão, não um bug.

notify pgrst, 'reload schema';
