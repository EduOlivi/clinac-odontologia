import "server-only";

/* ==========================================================================
   Leitura de variáveis de ambiente — SÓ NO SERVIDOR
   ==========================================================================
   O `import "server-only"` no topo é a trava mecânica: se algum dia um
   componente de cliente importar este arquivo (direta ou indiretamente), o
   build QUEBRA em vez de embutir a chave `service_role` no bundle que vai
   para o navegador. É o tipo de erro que só se percebe depois de vazar.

   Nenhuma CREDENCIAL deste projeto é `NEXT_PUBLIC_*` de propósito: o
   navegador nunca fala com o Supabase diretamente. O formulário fala com
   /api/leads e o painel /admin é renderizado no servidor — então nem a chave
   `anon` precisa sair daqui. Menos superfície, menos coisa para revisar.

   As duas exceções `NEXT_PUBLIC_*` que existem hoje não são segredo por
   definição do próprio produto que as emite:
     * `NEXT_PUBLIC_SITE_URL` — a URL pública do site;
     * `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — a *sitekey* do Turnstile, que a
       Cloudflare documenta como "public key used to invoke the Turnstile
       widget on your site" (ela PRECISA ir no HTML para o widget existir).
       Quem não pode vazar é a `TURNSTILE_SECRET_KEY`, abaixo — "private key
       used for server-side token validation", mesma régua da service_role.

   Compatibilidade com Cloudflare Workers: `process.env` funciona nas rotas do
   Next rodando sob OpenNext/Cloudflare (as vars e secrets do Worker são
   expostas ali). Lemos sempre em tempo de execução, dentro de função, nunca
   no topo do módulo — no Workers o módulo é avaliado uma vez por isolate e
   ler cedo demais pode pegar um ambiente ainda não populado.
   ========================================================================== */

/** Lança um erro claro em vez de deixar a falha aparecer como "fetch failed". */
function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Variável de ambiente ausente: ${name}. Veja .env.example para o que ela é e onde obter o valor.`,
    );
  }
  return value.trim();
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

/** URL do projeto Supabase (ex.: https://xxxxxxxx.supabase.co). Não é segredo. */
export const supabaseUrl = () => required("SUPABASE_URL");

/**
 * Chave `service_role`. IGNORA RLS — é efetivamente acesso root ao banco.
 * Só pode ser usada em Route Handlers / Server Actions. Se esta string
 * aparecer em qualquer resposta HTTP, log ou bundle, o projeto está
 * comprometido e a chave precisa ser rotacionada no painel do Supabase.
 */
export const supabaseServiceRoleKey = () => required("SUPABASE_SERVICE_ROLE_KEY");

/**
 * Chave `anon`. Respeita RLS — é a chave usada pela sessão autenticada do
 * painel /admin, para que a leitura dos leads passe pelas policies em vez
 * de contornar tudo com a service_role.
 */
export const supabaseAnonKey = () => required("SUPABASE_ANON_KEY");

/** Segredo compartilhado que o cron de keep-alive precisa enviar. */
export const keepaliveSecret = () => optional("KEEPALIVE_SECRET");

/** Segredo compartilhado que o cron de backup (R2) precisa enviar — ver
 *  app/api/backup-export/route.ts e docs/DEPLOY.md. */
export const backupExportSecret = () => optional("BACKUP_EXPORT_SECRET");

/* ---------- Cloudflare Turnstile (anti-bot do formulário) ---------- */

/**
 * Chave PRIVADA do widget Turnstile, usada só na chamada server-side ao
 * `siteverify` (app/lib/turnstile.ts). Mesma régua da `service_role` e da
 * `RESEND_API_KEY`: nunca em componente de cliente, nunca com prefixo
 * `NEXT_PUBLIC_`. Se vazar, um atacante consegue validar tokens em nome
 * deste site — rotacione no painel da Cloudflare (Turnstile -> widget ->
 * Settings -> Rotate secret key).
 *
 * `optional` e não `required` de propósito: quem decide o que fazer na
 * ausência dela é app/lib/turnstile.ts, que tem contexto para distinguir
 * "estou em `next dev`, use a chave de teste documentada" de "estou em
 * produção, negue" — um `required` aqui explodiria como 500 genérico.
 */
export const turnstileSecretKey = () => optional("TURNSTILE_SECRET_KEY");

/**
 * Sitekey PÚBLICA do widget. Existe aqui só para uso do servidor (log de
 * diagnóstico / checagem de configuração); quem realmente a usa é o
 * componente de cliente app/components/TurnstileWidget.tsx, que lê
 * `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY` direto.
 *
 * ATENÇÃO (deploy): por ser `NEXT_PUBLIC_*`, o Next INLINA este valor no
 * bundle do navegador em tempo de BUILD. Cadastrá-la só como `vars` no
 * wrangler.jsonc (runtime do Worker) NÃO faz ela chegar ao navegador — ela
 * precisa existir no ambiente que roda `next build`. Ver docs/DEPLOY.md.
 */
export const turnstileSiteKey = () => optional("NEXT_PUBLIC_TURNSTILE_SITE_KEY");

/* ---------- Notificação de novo lead (Resend) ---------- */

export const resendApiKey = () => optional("RESEND_API_KEY");
export const leadNotificationFrom = () => optional("LEAD_NOTIFICATION_FROM");
export const leadNotificationTo = () =>
  (optional("LEAD_NOTIFICATION_TO") ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

/**
 * Se `true`, o e-mail de aviso inclui o tratamento de interesse — que é DADO
 * DE SAÚDE (LGPD art. 11). O padrão é `false`: o e-mail avisa que chegou um
 * lead e dá nome/telefone para o retorno, e o dado de saúde fica só no banco,
 * visível no painel. Ver comentário completo em app/lib/notify.ts.
 */
export const includeHealthDataInEmail = () =>
  (optional("LEAD_EMAIL_INCLUDE_HEALTH_DATA") ?? "false").toLowerCase() === "true";

/** URL pública do site, usada só para montar o link do painel no e-mail. */
export const siteUrl = () =>
  optional("NEXT_PUBLIC_SITE_URL") ?? "https://eduolivi.github.io/clinac-odontologia";
