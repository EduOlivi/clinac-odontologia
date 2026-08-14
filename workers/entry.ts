/* ==========================================================================
   workers/entry.ts — entrada real do Worker (ver "main" em wrangler.jsonc)
   ==========================================================================
   O adapter OpenNext gera `.open-next/worker.js` a cada build, exportando só
   um handler `fetch`. Ele não expõe jeito de acrescentar um handler
   `scheduled` (Cron Trigger) — o padrão documentado pelo próprio OpenNext
   para isso é este: um arquivo próprio, fora de `.open-next/` (que é
   apagado/regerado a cada build), que importa o `fetch` gerado e acrescenta
   o que falta por cima.
   Ver https://opennext.js.org/cloudflare/howtos/custom-worker.

   O `@ts-ignore` na importação abaixo é o mesmo do exemplo oficial: o
   arquivo `.open-next/worker.js` só existe DEPOIS de rodar
   `opennextjs-cloudflare build` (ver `npm run build:worker` / `npm run
   deploy` no package.json) — não existe no repositório (está no
   .gitignore) nem antes do primeiro build local. Sem o `@ts-ignore`,
   `tsc --noEmit` falharia sempre que rodado num checkout limpo, antes do
   primeiro build.

   Por isso este projeto NÃO usa `@cloudflare/workers-types` global (via
   tsconfig.json): esse pacote redefine globals (Request/Response/
   ReadableStream...) que já vêm da lib "dom" usada pelo resto do app
   Next.js, e as duas definições divergem o suficiente para gerar erros de
   tipo em arquivos que não têm nada a ver com o Worker. Os tipos mínimos de
   que este arquivo precisa (Env, o `env` do scheduled, o `ctx.waitUntil`)
   estão declarados à mão logo abaixo — é mais barato manter três interfaces
   pequenas aqui do que arriscar quebrar o typecheck do site inteiro.
   ========================================================================== */

// `@ts-expect-error` não serve aqui: ele vira erro ("directive unused") na
// hora em que `.open-next/worker.js` já existe no disco (ex.: rodar
// `tsc --noEmit` de novo depois de um build local), porque nesse caso a
// linha deixa de ter erro. `@ts-ignore` é o único dos dois que funciona nos
// dois estados (arquivo ausente ou presente) — é o mesmo usado no exemplo
// oficial do adapter.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore `.open-next/worker.js` é gerado em tempo de build (ver acima)
import { default as openNextHandler } from "../.open-next/worker.js";

interface WorkerEnv {
  /** Bearer token exigido por GET /api/keepalive — mesmo segredo, dos dois lados. */
  KEEPALIVE_SECRET?: string;
  /** Caminho da rota de keep-alive (var não secreta, ver wrangler.jsonc). */
  KEEPALIVE_ENDPOINT_PATH?: string;
  /** Bearer token exigido por GET /api/backup-export — segredo separado do
   *  keep-alive de propósito (blast radius menor se um vazar sozinho). */
  BACKUP_EXPORT_SECRET?: string;
  /** Caminho da rota de backup (var não secreta, ver wrangler.jsonc). */
  BACKUP_EXPORT_ENDPOINT_PATH?: string;
  /** Bind de auto-referência (ver "services" em wrangler.jsonc) — chama este
   *  mesmo Worker sem sair para a rede, então não precisa saber o domínio de
   *  produção nem depender de DNS/TLS estarem corretos para o cron rodar. */
  WORKER_SELF_REFERENCE: { fetch: typeof fetch };
  // Demais bindings/secrets do Worker (SUPABASE_URL, BACKUPS_BUCKET etc.)
  // existem em runtime mas não são usados neste arquivo — as rotas mesmas
  // (app/api/keepalive, app/api/backup-export) é que os leem.
  [key: string]: unknown;
}

interface MinimalExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

/** O evento que dispara `scheduled` — só o que este arquivo lê. */
interface MinimalScheduledController {
  /** A expressão cron exata que disparou (ver "triggers.crons" em wrangler.jsonc) —
   *  é assim que um único handler `scheduled` distingue keep-alive de backup. */
  cron: string;
}

/**
 * Chama uma rota interna protegida por bearer token, por bind de
 * auto-referência (sem sair para a rede). Nunca lança — um cron que falha
 * silenciosamente (sem nem logar) é pior que não ter cron, porque ninguém
 * percebe. Ver observability em wrangler.jsonc para onde este log aparece
 * (Workers Logs).
 */
async function chamarRotaInterna(
  env: WorkerEnv,
  opts: { evento: string; secret: string | undefined; path: string; caminhoPadrao: string },
): Promise<void> {
  if (!opts.secret) {
    // Acontece se o segredo ainda não foi cadastrado com `wrangler secret
    // put` — ver docs/DEPLOY.md. Isto aparece já na primeira execução do
    // cron, não silenciosamente.
    console.error(JSON.stringify({ evento: `${opts.evento}_sem_segredo` }));
    return;
  }

  const path = opts.path || opts.caminhoPadrao;
  // O host não importa: o bind de serviço resolve direto para este Worker,
  // sem consulta de DNS nenhuma — é só preciso ser uma URL válida.
  const url = `https://cron.internal${path}`;

  try {
    const response = await env.WORKER_SELF_REFERENCE.fetch(url, {
      headers: { Authorization: `Bearer ${opts.secret}` },
    });

    if (!response.ok) {
      console.error(
        JSON.stringify({ evento: `${opts.evento}_falhou`, status: response.status }),
      );
      return;
    }

    console.log(JSON.stringify({ evento: `${opts.evento}_ok` }));
  } catch (err) {
    console.error(
      JSON.stringify({
        evento: `${opts.evento}_excecao`,
        detalhe: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}

function runKeepalive(env: WorkerEnv): Promise<void> {
  return chamarRotaInterna(env, {
    evento: "keepalive_cron",
    secret: env.KEEPALIVE_SECRET,
    path: env.KEEPALIVE_ENDPOINT_PATH ?? "",
    caminhoPadrao: "/api/keepalive",
  });
}

function runBackupExport(env: WorkerEnv): Promise<void> {
  return chamarRotaInterna(env, {
    evento: "backup_export_cron",
    secret: env.BACKUP_EXPORT_SECRET,
    path: env.BACKUP_EXPORT_ENDPOINT_PATH ?? "",
    caminhoPadrao: "/api/backup-export",
  });
}

const worker = {
  // Todo o resto do site (site institucional, /api/leads, /admin) passa
  // direto para o handler gerado pelo OpenNext — este arquivo não muda
  // nenhum comportamento de requisição HTTP normal.
  fetch: openNextHandler.fetch,

  // Cron Trigger (ver "triggers.crons" em wrangler.jsonc) — não é uma
  // requisição HTTP, é um evento próprio do Workers que só este handler
  // recebe. `waitUntil` garante que o Worker não é encerrado antes do fetch
  // interno terminar. `controller.cron` diz qual das duas expressões
  // disparou — um Worker só, dois crons, cada um chama uma rota diferente.
  async scheduled(
    controller: MinimalScheduledController,
    env: WorkerEnv,
    ctx: MinimalExecutionContext,
  ): Promise<void> {
    if (controller.cron === "10 6 * * 1") {
      ctx.waitUntil(runBackupExport(env));
      return;
    }
    // Qualquer outra expressão (hoje só "0 6 * * *") cai no keep-alive —
    // é o padrão mais seguro: se algum dia sobrar um terceiro cron sem
    // branch dedicado, ele ainda faz algo útil em vez de não fazer nada.
    ctx.waitUntil(runKeepalive(env));
  },
};

export default worker;
