-- ============================================================================
-- supabase/tests/rls_leads.test.sql
-- ============================================================================
-- Testa DIRETO no Postgres, sem passar pela rota/app, que as RLS policies e
-- grants de supabase/migrations/20260814120000_leads.sql realmente NEGAM o
-- que dizem negar — não só que o app, usado normalmente, se comporta bem
-- (isso testaria apenas que o app manda requisições permitidas; nunca prova
-- que uma requisição não-permitida seria barrada).
--
-- >>> ESTE ARQUIVO FOI ESCRITO MAS NÃO EXECUTADO <<<
-- O ambiente onde este arquivo foi escrito não tem Docker nem a CLI do
-- Supabase disponível (necessários para levantar um Postgres local via
-- `supabase start`), e não existe ainda um projeto Supabase real para este
-- site (ver README, seção de pendências). Rode isto — e confira que todo
-- bloco imprime "PASS" e nenhum "FAIL"/erro inesperado — antes do
-- lançamento, e de novo depois de qualquer mudança na migração de RLS.
--
-- COMO RODAR
-- ----------
-- Opção A (recomendada) — Supabase local, com Docker instalado:
--   supabase start
--   psql "$(supabase status -o json | node -pe 'JSON.parse(require("fs").readFileSync(0)).DB_URL')" \
--     -v ON_ERROR_STOP=1 -f supabase/tests/rls_leads.test.sql
--   (ou, mais simples: psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f ...)
--
-- Opção B — um projeto Supabase de TESTE/descartável (NÃO o de produção):
--   Painel -> Settings -> Database -> Connection string (URI, modo "Session"),
--   depois: psql "<connection-string>" -f supabase/tests/rls_leads.test.sql
--
-- Por que não colar no SQL Editor do painel do Supabase: o editor às vezes
-- reseta o `role`/GUCs entre statements dependendo da versão, o que quebra
-- os testes de troca de papel abaixo. `psql` garante uma sessão/transação
-- contínua, que é o que este arquivo depende.
--
-- SEGURANÇA DO PRÓPRIO TESTE: tudo roda dentro de UMA transação com ROLLBACK
-- no final — nenhuma linha de teste fica gravada, mesmo rodando contra um
-- projeto com dados reais. Ainda assim, prefira um projeto de teste: este
-- script insere linhas em auth.users diretamente (fora do fluxo normal do
-- Supabase Auth), o que é seguro dentro de uma transação que sempre desfaz,
-- mas não é um padrão a normalizar contra produção.
--
-- NOTA SOBRE auth.uid(): este script assume a definição padrão do Supabase
-- Auth, que lê o claim "sub" de current_setting('request.jwt.claims', true).
-- Se `is_clinic_staff()` devolver sempre NULL/false mesmo com o setting
-- abaixo, confira a definição real de auth.uid() no projeto (pode variar
-- entre versões do Supabase) e ajuste os `set local` correspondentes.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0) Fixtures: dois usuários (um staff, um não-staff) e um lead de teste
-- ----------------------------------------------------------------------------
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'staff-teste@clinac.invalid')
on conflict (id) do nothing;

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000002', 'visitante-teste@clinac.invalid')
on conflict (id) do nothing;

insert into public.admin_users (user_id, email)
values ('00000000-0000-0000-0000-000000000001', 'staff-teste@clinac.invalid')
on conflict (user_id) do nothing;

-- Inserido como o role da sessão (deve ser um role com BYPASSRLS, ex.:
-- `postgres`, ao conectar via connection string do painel/CLI — é assim que
-- /api/leads insere de verdade, com service_role).
insert into public.leads (id, nome, telefone, tratamento, consentimento_lgpd, politica_versao, status)
values ('00000000-0000-0000-0000-0000000000aa', 'Paciente de Teste', '31999990000', 'Ortodontia', true, 'v-teste', 'novo')
on conflict (id) do nothing;

do $$ begin raise notice '--- fixtures criadas ---'; end $$;

-- ----------------------------------------------------------------------------
-- 1) anon não lê NADA de public.leads
-- ----------------------------------------------------------------------------
set local role anon;

do $$
declare
  linhas int;
begin
  begin
    select count(*) into linhas from public.leads;
    raise exception 'FAIL - anon conseguiu fazer SELECT em public.leads (leu % linha(s)); esperado: permission denied', linhas;
  exception
    when insufficient_privilege then
      raise notice 'PASS - anon recebeu permission denied ao tentar SELECT em public.leads';
  end;
end $$;

-- ----------------------------------------------------------------------------
-- 2) anon não INSERE em public.leads (não existe caminho de INSERT público)
-- ----------------------------------------------------------------------------
do $$
begin
  begin
    insert into public.leads (nome, telefone, tratamento, consentimento_lgpd, politica_versao)
    values ('Bot Teste', '31988887777', 'Clareamento', true, 'v-teste');
    raise exception 'FAIL - anon conseguiu fazer INSERT em public.leads; esperado: permission denied';
  exception
    when insufficient_privilege then
      raise notice 'PASS - anon recebeu permission denied ao tentar INSERT em public.leads';
  end;
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 3) authenticated LOGADO MAS FORA da allowlist admin_users -> zero linhas
--    (não é permission denied — é o grant SELECT existindo, mas a RLS
--    policy usando is_clinic_staff() filtrando tudo. É o comportamento
--    que app/admin/leads/page.tsx depende para mostrar "sem permissão" em
--    vez de vazar dado.)
-- ----------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

do $$
declare
  linhas int;
  eh_staff boolean;
begin
  select public.is_clinic_staff() into eh_staff;
  if eh_staff is true then
    raise exception 'FAIL - is_clinic_staff() retornou true para um usuário FORA de admin_users';
  end if;
  raise notice 'PASS - is_clinic_staff() retornou false/null para usuário não-staff';

  select count(*) into linhas from public.leads;
  if linhas <> 0 then
    raise exception 'FAIL - authenticated não-staff leu % linha(s) de public.leads; esperado: 0', linhas;
  end if;
  raise notice 'PASS - authenticated não-staff vê 0 linhas em public.leads (RLS filtrou tudo)';
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 4) authenticated NA allowlist -> lê o(s) lead(s)
-- ----------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

do $$
declare
  linhas int;
  eh_staff boolean;
begin
  select public.is_clinic_staff() into eh_staff;
  if eh_staff is not true then
    raise exception 'FAIL - is_clinic_staff() não retornou true para um usuário QUE ESTÁ em admin_users';
  end if;
  raise notice 'PASS - is_clinic_staff() retornou true para o usuário staff de teste';

  select count(*) into linhas from public.leads;
  if linhas < 1 then
    raise exception 'FAIL - staff não conseguiu ler o lead de teste (leu % linha(s))', linhas;
  end if;
  raise notice 'PASS - staff lê % linha(s) em public.leads (>= 1, esperado)', linhas;
end $$;

-- ----------------------------------------------------------------------------
-- 5) staff PODE atualizar `status`...
-- ----------------------------------------------------------------------------
do $$
declare
  afetadas int;
begin
  update public.leads set status = 'contatado' where id = '00000000-0000-0000-0000-0000000000aa';
  get diagnostics afetadas = row_count;
  if afetadas <> 1 then
    raise exception 'FAIL - staff não conseguiu atualizar status do lead de teste (% linha(s) afetada(s))', afetadas;
  end if;
  raise notice 'PASS - staff atualizou status do lead de teste com sucesso';
end $$;

-- ----------------------------------------------------------------------------
-- 6) ...mas NÃO pode atualizar outras colunas (nome, telefone, consentimento)
--    — o GRANT é por coluna (`grant update (status) ... to authenticated`),
--    então isto precisa falhar mesmo sendo staff.
-- ----------------------------------------------------------------------------
do $$
begin
  begin
    update public.leads set nome = 'Nome Alterado Indevidamente' where id = '00000000-0000-0000-0000-0000000000aa';
    raise exception 'FAIL - staff conseguiu atualizar a coluna `nome` de um lead; esperado: permission denied (grant é só na coluna status)';
  exception
    when insufficient_privilege then
      raise notice 'PASS - staff recebeu permission denied ao tentar atualizar `nome` (grant por coluna funcionando)';
  end;
end $$;

reset role;

-- ----------------------------------------------------------------------------
-- 7) authenticated não-staff: UPDATE em status não falha como erro, mas
--    afeta ZERO linhas (a policy de UPDATE também usa is_clinic_staff()).
-- ----------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

do $$
declare
  afetadas int;
begin
  update public.leads set status = 'agendado' where id = '00000000-0000-0000-0000-0000000000aa';
  get diagnostics afetadas = row_count;
  if afetadas <> 0 then
    raise exception 'FAIL - authenticated não-staff conseguiu atualizar status de um lead (% linha(s) afetada(s)); esperado: 0', afetadas;
  end if;
  raise notice 'PASS - UPDATE de status por não-staff afeta 0 linhas (RLS bloqueou via using-clause)';
end $$;

reset role;

do $$ begin raise notice '--- todos os blocos rodaram; confira que não há nenhum FAIL acima ---'; end $$;

rollback;
