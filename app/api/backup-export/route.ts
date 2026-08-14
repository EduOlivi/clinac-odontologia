import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { backupExportSecret } from "../../lib/env";
import { checkRateLimit, clientIp } from "../../lib/rate-limit";
import { createServiceRoleClient } from "../../lib/supabase/admin";

/* ==========================================================================
   GET|POST /api/backup-export — exportação semanal de `leads` para R2
   ==========================================================================
   >>> POR QUE ISTO EXISTE <<<
   O plano free do Supabase NÃO faz backup automático (isso é só Pro/Team/
   Enterprise — confirmado na documentação do Supabase em
   https://supabase.com/docs/guides/platform/backups). "Reverter o deploy"
   não desfaz uma migração ruim, um script destrutivo ou um bug que rodou por
   um dia — nada disso é código, é dado, e sem backup do provedor o único jeito
   de recuperar é ter uma cópia própria. Esta rota é essa cópia própria.

   Chamada 1x por semana pelo Cron Trigger em wrangler.jsonc (ver
   workers/entry.ts) — grava um JSON com todos os leads no bucket R2
   `BACKUPS_BUCKET` (mesma conta Cloudflare que já hospeda o Worker, então
   isto NÃO introduz um novo terceiro no fluxo de dado de saúde — ao
   contrário de, por exemplo, mandar o dump por e-mail via Resend, que
   copiaria dado de saúde para mais uma empresa + a caixa postal da clínica
   sem uma decisão de compliance por trás, do mesmo jeito que
   app/lib/notify.ts já trata isso para o aviso de lead individual).

   >>> RETENÇÃO: 8 DUMPS, AGORA REVISADO POR COMPLIANCE (2026-08-14) <<<
   Mantém só os `RETENCAO_MAX_BACKUPS` dumps mais recentes (rotaciona os
   mais antigos) — de propósito, para o backup não virar ele mesmo um
   depósito sem prazo de dado de saúde (LGPD art. 6º III, necessidade).

   NÃO SUBA ESTE NÚMERO PARA "BATER" COM O PRAZO DE RETENÇÃO DOS LEADS.
   PRIVACIDADE.md v2.0 §5 fixou a retenção do lead em 12 meses, mas isso NÃO
   quer dizer 52 backups semanais: o backup existe para recuperar de falha
   técnica recente (migração ruim, DELETE sem WHERE, bug que rodou por um
   dia), não para arquivar. Guardar um ano de cópias de dado de saúde só
   multiplicaria a superfície de vazamento sem servir a nenhuma finalidade
   adicional. 8 semanas (~2 meses) é a janela declarada aos titulares na
   própria política ("pode sobreviver em cópia de segurança por até cerca de
   2 meses") — mexer aqui exige atualizar aquele texto no mesmo commit.
   Ver docs/DEPLOY.md, seção "Backup e recuperação de dados".

   >>> UM PEDIDO DE EXCLUSÃO (LGPD art. 18, VI) NÃO APAGA ISTO SOZINHO <<<
   Apagar um lead de `public.leads` (ver supabase/data-subject-requests.sql)
   não remove cópias já gravadas em backups anteriores dentro da janela de
   retenção. Quem processar um pedido de exclusão precisa também abrir os
   backups afetados e remover a linha — ver docs/DEPLOY.md.

   >>> RESTORE É MANUAL, DE PROPÓSITO <<<
   Esta rota só GRAVA. Não existe rota de restore automática — restaurar é
   raro e de alto risco (pode sobrescrever dado mais novo com um dump
   velho), então exige uma pessoa olhando, do mesmo jeito que
   supabase/data-subject-requests.sql trata exclusão como operação manual e
   não como botão de um clique. Passo a passo em docs/DEPLOY.md.
   ========================================================================== */

const RATE_LIMIT = { limit: 5, windowMs: 60 * 1000 };
const RETENCAO_MAX_BACKUPS = 8; // ~2 meses com cadência semanal
const PREFIXO_R2 = "leads/";

/** Mesma comparação em tempo constante usada por /api/keepalive. */
function secretsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function providedSecret(request: Request): string {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return request.headers.get("x-backup-secret")?.trim() ?? "";
}

/** Tipo mínimo do binding R2 usado aqui — ver nota sobre workers-types em workers/entry.ts. */
interface MinimalR2Bucket {
  put(key: string, value: string): Promise<unknown>;
  list(options?: { prefix?: string }): Promise<{ objects: Array<{ key: string }> }>;
  delete(keys: string | string[]): Promise<void>;
}

function getBackupsBucket(): MinimalR2Bucket | undefined {
  const { env } = getCloudflareContext();
  return (env as unknown as { BACKUPS_BUCKET?: MinimalR2Bucket }).BACKUPS_BUCKET;
}

/** Apaga os dumps mais antigos além de RETENCAO_MAX_BACKUPS. Nunca lança. */
async function rotacionarBackupsAntigos(bucket: MinimalR2Bucket): Promise<number> {
  const { objects } = await bucket.list({ prefix: PREFIXO_R2 });
  // As chaves têm a data no nome (leads/2026-08-14.json), então ordenação
  // lexicográfica == ordenação cronológica — sem precisar ler metadata extra.
  const chavesOrdenadas = objects.map((o) => o.key).sort();
  const excedentes = chavesOrdenadas.slice(0, Math.max(0, chavesOrdenadas.length - RETENCAO_MAX_BACKUPS));
  if (excedentes.length > 0) await bucket.delete(excedentes);
  return excedentes.length;
}

async function handle(request: Request) {
  const noStore = { "Cache-Control": "no-store" };

  const decision = await checkRateLimit(`backup-export:${clientIp(request)}`, RATE_LIMIT);
  if (!decision.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate limit" },
      { status: 429, headers: { ...noStore, "Retry-After": String(decision.retryAfterSeconds) } },
    );
  }

  // SEGURANÇA: checa o segredo do chamador ANTES de revelar se a rota está
  // configurada. A ordem antiga (checar `expected` primeiro, 503 "não
  // configurado") deixava um prober não-autenticado descobrir, sem
  // credencial nenhuma, se a rota já tinha segredo definido — informação de
  // graça sobre o estado do deploy. Agora a resposta é sempre 401 uniforme;
  // a distinção (não configurado vs. segredo errado) só vai pro log do
  // servidor.
  const expected = backupExportSecret() ?? "";
  const valido = expected.length > 0 && secretsMatch(providedSecret(request), expected);
  if (!valido) {
    if (!expected) {
      console.error(JSON.stringify({ evento: "backup_export_sem_segredo_configurado" }));
    }
    return NextResponse.json(
      { ok: false, error: "backup-export: não autorizado" },
      { status: 401, headers: noStore },
    );
  }

  const bucket = getBackupsBucket();
  if (!bucket) {
    // Não derruba o site — só significa que o backup automático ainda não
    // está configurado (bucket R2 não criado / binding ausente em
    // wrangler.jsonc). Ver docs/DEPLOY.md, passo "Backup (R2)".
    console.error(JSON.stringify({ evento: "backup_export_sem_bucket" }));
    return NextResponse.json(
      { ok: false, error: "backup-export: binding BACKUPS_BUCKET não configurado" },
      { status: 503, headers: noStore },
    );
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(
        JSON.stringify({ evento: "backup_export_erro_consulta", codigo: error.code, mensagem: error.message }),
      );
      return NextResponse.json(
        { ok: false, error: "backup-export: banco indisponível" },
        { status: 502, headers: noStore },
      );
    }

    const geradoEm = new Date().toISOString();
    const payload = JSON.stringify({ gerado_em: geradoEm, tabela: "leads", total: data.length, linhas: data });
    // SEGURANÇA: a chave usa só a DATA (YYYY-MM-DD), não o timestamp completo.
    // Com o timestamp completo, cada chamada gerava uma chave nova — e como
    // rotacionarBackupsAntigos() mantém só as RETENCAO_MAX_BACKUPS mais
    // recentes, 8 chamadas seguidas (ex.: segredo vazado) apagavam TODO o
    // histórico de backup e o substituíam por 8 cópias do mesmo estado atual.
    // Com chave por dia, chamadas repetidas no mesmo dia apenas SOBRESCREVEM
    // o dump de hoje — não consomem uma vaga de rotação.
    const chave = `${PREFIXO_R2}${geradoEm.slice(0, 10)}.json`;

    await bucket.put(chave, payload);
    const removidos = await rotacionarBackupsAntigos(bucket);

    // Log tem contagem/chave (metadado operacional), NUNCA nome/telefone/
    // tratamento — mesma régua do resto do projeto (ver app/api/leads).
    console.info(
      JSON.stringify({ evento: "backup_export_ok", chave, total: data.length, backups_removidos: removidos }),
    );
    return NextResponse.json({ ok: true }, { status: 200, headers: noStore });
  } catch (err) {
    console.error(
      JSON.stringify({
        evento: "backup_export_excecao",
        detalhe: err instanceof Error ? err.message : String(err),
      }),
    );
    return NextResponse.json(
      { ok: false, error: "backup-export: falha inesperada" },
      { status: 500, headers: noStore },
    );
  }
}

export const GET = handle;
export const POST = handle;
