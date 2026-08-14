-- ============================================================================
-- Clínac Odontologia — atendimento a pedidos de titular (LGPD art. 18)
-- ============================================================================
-- Este arquivo NÃO é uma migração. São consultas prontas para rodar à mão no
-- SQL Editor do Supabase quando um titular exercer um direito. É o processo
-- manual documentado exigido antes de o site receber leads reais — de
-- propósito não existe botão de "apagar" no painel /admin/leads: apagar dado
-- de titular é uma operação irreversível e sem trilha de auditoria neste
-- projeto, então deve exigir uma pessoa, uma decisão e um registro fora do
-- sistema.
--
-- REGISTRE FORA DAQUI (planilha, e-mail arquivado, o que o dono do site usar):
-- data do pedido, como o titular foi identificado, o que foi feito e quando.
-- O banco não guarda esse histórico.
--
-- Identificação do titular: o formulário só coleta nome e telefone, então o
-- telefone é a chave prática de busca. Confirme a identidade por outro canal
-- (ligação para o próprio número, por exemplo) antes de exportar ou apagar —
-- responder a um pedido falso é, em si, um vazamento.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) CONFIRMAÇÃO DE EXISTÊNCIA / ACESSO (art. 18, I e II)
--    "Vocês têm dados meus?" + "Me mande o que vocês têm."
--    Devolve um JSON por lead, pronto para colar na resposta ao titular.
-- ----------------------------------------------------------------------------
select jsonb_pretty(jsonb_agg(to_jsonb(l) order by l.created_at desc))
from public.leads l
where regexp_replace(l.telefone, '\D', '', 'g')
      = regexp_replace('31 99999-0000', '\D', '', 'g');  -- <<< telefone do titular
      -- compara só os dígitos: o formulário é texto livre, então
      -- "(31) 99999-0000" e "31999990000" são o mesmo titular.


-- ----------------------------------------------------------------------------
-- 2) ELIMINAÇÃO (art. 18, VI) — irreversível, sem backup automático
--    Rode o SELECT de cima ANTES, confira quantas linhas voltam, e só então
--    rode o DELETE. Guarde o JSON exportado se houver necessidade legal de
--    comprovar o que existia (a LGPD permite reter o mínimo para cumprir
--    obrigação legal ou exercício de direito em processo).
-- ----------------------------------------------------------------------------
-- delete from public.leads
-- where regexp_replace(telefone, '\D', '', 'g')
--       = regexp_replace('31 99999-0000', '\D', '', 'g')
-- returning id, created_at, nome;


-- ----------------------------------------------------------------------------
-- 3) REVOGAÇÃO DO CONSENTIMENTO DE MARKETING (art. 8º §5º)
--    "Não quero mais receber novidades" — não é pedido de exclusão: o lead
--    segue existindo para o atendimento já em curso.
-- ----------------------------------------------------------------------------
-- update public.leads
-- set consentimento_marketing = false
-- where regexp_replace(telefone, '\D', '', 'g')
--       = regexp_replace('31 99999-0000', '\D', '', 'g')
-- returning id, nome, consentimento_marketing;


-- ----------------------------------------------------------------------------
-- 4) EXPORTAÇÃO COMPLETA (backup antes de mexer no schema / portabilidade)
-- ----------------------------------------------------------------------------
select jsonb_pretty(jsonb_agg(to_jsonb(l) order by l.created_at))
from public.leads l;
-- Alternativa sem SQL: painel → Table Editor → tabela `leads` → Export → CSV.
-- O CSV sai com dado de saúde em texto puro: trate o arquivo como
-- confidencial (não mandar por WhatsApp, não deixar em Downloads).


-- ----------------------------------------------------------------------------
-- 5) EXPURGO POR RETENÇÃO — PRAZO DEFINIDO: 12 MESES
-- ----------------------------------------------------------------------------
-- Decidido por compliance em 2026-08-14 e publicado em PRIVACIDADE.md v2.0,
-- seção 5: um pedido de avaliação é apagado 12 MESES depois da ÚLTIMA
-- INTERAÇÃO registrada. Passado esse prazo, guardar nome, telefone e uma
-- informação de saúde de quem procurou a clínica não tem mais finalidade —
-- e tratamento sem finalidade contraria o princípio da necessidade
-- (LGPD art. 6º, III).
--
-- POR QUE `atualizado_em` E NÃO `created_at`: o trigger da migração atualiza
-- `atualizado_em` a cada mudança de status, então ele é a data do último
-- contato REAL com aquela pessoa. Usar `created_at` apagaria alguém que
-- enviou o formulário há 13 meses e virou paciente ativo no mês passado.
--
-- POR QUE VALE PARA TODOS OS STATUS, INCLUSIVE 'compareceu': quem virou
-- paciente tem os dados clínicos no PRONTUÁRIO, fora deste site, com prazo de
-- guarda próprio (ver PRIVACIDADE.md §5). Manter uma segunda cópia aqui, sem
-- prazo, transformaria a tabela de leads num prontuário paralelo — que é
-- exatamente o que ela não pode ser.
--
-- CADÊNCIA: trimestral, à mão. Neste volume não vale um cron; e um cron que
-- apaga dado de titular sozinho é justamente o tipo de automação que este
-- arquivo evita de propósito (ver cabeçalho).
--
-- ANTES DE RODAR: troque o `delete` por um `select id, nome, atualizado_em`
-- com o mesmo `where` e confira o que vai sair.
--
-- delete from public.leads
-- where atualizado_em < now() - interval '12 months'
-- returning id, created_at, atualizado_em, status;
--
-- >>> O BACKUP NÃO É APAGADO POR ESTA CONSULTA <<<
-- app/api/backup-export/route.ts guarda as 8 cópias semanais mais recentes
-- (~2 meses) no R2, e elas contêm as linhas apagadas aqui. Isso está
-- DECLARADO em PRIVACIDADE.md §5 ("pode sobreviver em cópia de segurança por
-- até cerca de 2 meses"), então o expurgo de rotina pode deixar a rotação
-- resolver. O que NÃO pode esperar a rotação é um pedido de ELIMINAÇÃO de um
-- titular (item 2 acima, art. 18, VI): nesse caso é preciso abrir os backups
-- da janela e remover a linha à mão — ver docs/DEPLOY.md.
