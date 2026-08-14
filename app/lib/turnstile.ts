import "server-only";

import { turnstileSecretKey, turnstileSiteKey } from "./env";
import { MAX_TURNSTILE_TOKEN_LENGTH } from "./leads";

/* ==========================================================================
   Cloudflare Turnstile — verificação server-side do desafio
   ==========================================================================
   POR QUE ISTO EXISTE (o achado que ele fecha)
   --------------------------------------------
   A revisão de segurança apontou que o rate limit de app/lib/rate-limit.ts é
   best-effort em Cloudflare Workers (contador por isolate, isolates são
   reciclados e espalhados) e que o honeypot `_gotcha` só pega o bot que
   preenche todo campo que encontra no HTML. Um script que monta o JSON "na
   mão" passa pelos dois. O prejuízo concreto verificado: `notifyNewLead()`
   dispara um e-mail via Resend a cada envio aceito, e o plano free do Resend
   corta por volta de 100 e-mails/dia — ou seja, ~100 requisições roteirizadas
   queimam a cota do dia e, a partir dali, lead de paciente real não gera
   aviso nenhum, sem ninguém perceber. E o painel /admin (sem paginação nem
   busca, por decisão de escopo) fica soterrado de lixo.

   Turnstile ataca a origem do problema ("isto é um navegador com uma pessoa
   atrás?") em vez de contar requisições. É gratuito e vive na MESMA conta
   Cloudflare que já hospeda o Worker — não entra fornecedor novo no fluxo, o
   que importa aqui porque o dado deste formulário é dado de saúde (LGPD
   art. 11) e cada terceiro a mais é uma conversa de compliance a mais.

   ONDE ELE ENTRA NA ROTA (e por que a ordem é o ponto todo)
   --------------------------------------------------------
   Em app/api/leads/route.ts a verificação roda DEPOIS das checagens baratas
   (content-type, rate limit, teto de corpo, honeypot) e ANTES de
   `validateLeadPayload`, do insert e — principalmente — do `notifyNewLead`.
   Um desafio ausente/reprovado precisa custar ZERO e-mail. Se um dia alguém
   mover esta chamada para depois do disparo do e-mail, o achado de segurança
   volta inteiro; existe teste automatizado travando exatamente isso em
   app/api/leads/route.test.ts ("Resend NÃO é chamado quando o Turnstile
   falha").

   POSTURA NA AUSÊNCIA DE CONFIGURAÇÃO: NEGAR
   ------------------------------------------
   Sem `TURNSTILE_SECRET_KEY` em produção, esta função NEGA (`nao-configurado`)
   em vez de deixar passar. Deixar passar seria recriar em silêncio exatamente
   o buraco que este arquivo existe para fechar — e "em silêncio" é a parte
   pior: ninguém descobriria até a cota de e-mail queimar de novo. A
   consequência é explícita e precisa ser sabida por quem for lançar o site:
   ENQUANTO A CHAVE NÃO FOR CADASTRADA, O FORMULÁRIO NÃO ACEITA ENVIO (o
   visitante recebe uma mensagem que o manda para o WhatsApp, que continua
   funcionando). Ver docs/DEPLOY.md, seção "Cloudflare Turnstile".

   Fora de produção (`next dev`, `npm test`, `npm run preview`), a ausência de
   chave cai nas CHAVES DE TESTE DOCUMENTADAS pela Cloudflare
   (https://developers.cloudflare.com/turnstile/troubleshooting/testing/),
   com um aviso barulhento no log. Isso mantém `npm run dev`/`npm test`
   funcionando sem exigir uma conta Turnstile de verdade, sem nunca virar um
   caminho de "passa sem verificar" em produção.
   ========================================================================== */

const SITEVERIFY_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** O siteverify responde em dezenas de ms; 5 s já é um teto muito folgado. */
const VERIFY_TIMEOUT_MS = 5000;

/**
 * Chave secreta de TESTE da Cloudflare que aprova qualquer token
 * ("always passes"), documentada em
 * https://developers.cloudflare.com/turnstile/troubleshooting/testing/.
 * Só é usada quando NÃO estamos em produção — ver `resolveSecret()`.
 */
export const TEST_SECRET_KEY_ALWAYS_PASSES = "1x0000000000000000000000000000000AA";

export type TurnstileVerdict =
  | { ok: true }
  | {
      ok: false;
      /**
       * `token-ausente`  — o corpo não trouxe token (ou veio vazio).
       * `token-invalido` — o Cloudflare reprovou (expirado, já usado,
       *                    forjado, hostname errado) ou o token veio maior
       *                    que o máximo documentado.
       * `nao-configurado`— falta TURNSTILE_SECRET_KEY em produção.
       * `indisponivel`   — não foi possível FALAR com o siteverify.
       */
      reason: "token-ausente" | "token-invalido" | "nao-configurado" | "indisponivel";
      /** `error-codes` da Cloudflare. Só para log — nunca para a resposta HTTP. */
      codes?: string[];
      detail?: string;
    };

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Decide qual segredo usar, ou `null` para negar.
 *
 * Um `console.error`/`console.warn` a cada requisição é ruído, mas aqui é
 * ruído desejado: os dois casos abaixo são configuração faltando, não estado
 * normal de operação, e ambos aparecem no `wrangler tail` de quem estiver
 * investigando "por que o formulário parou".
 */
function resolveSecret(): string | null {
  const configured = turnstileSecretKey();
  if (configured) return configured;

  if (isProduction()) {
    console.error(
      JSON.stringify({
        evento: "turnstile_nao_configurado",
        // Ajuda a distinguir "esqueci as duas" de "cadastrei só a pública" —
        // o segundo caso é o erro clássico de quem cadastrou a sitekey no
        // build e esqueceu o `wrangler secret put` da secreta.
        sitekey_presente: Boolean(turnstileSiteKey()),
        acao: "cadastre TURNSTILE_SECRET_KEY (wrangler secret put) — ver docs/DEPLOY.md",
      }),
    );
    return null;
  }

  console.warn(
    JSON.stringify({
      evento: "turnstile_chave_de_teste",
      aviso:
        "TURNSTILE_SECRET_KEY ausente fora de produção — usando a chave de TESTE da Cloudflare " +
        "(aprova qualquer token). Isto NUNCA acontece em produção; lá a ausência da chave nega o envio.",
    }),
  );
  return TEST_SECRET_KEY_ALWAYS_PASSES;
}

/**
 * Verifica o token do Turnstile contra o `siteverify` da Cloudflare.
 *
 * NUNCA lança: devolve um veredito que a rota traduz em resposta HTTP + log.
 * Uma exceção escapando daqui viraria 500 e, pior, atravessaria a barreira
 * que ela deveria ser.
 *
 * @param token valor do campo `cf-turnstile-response` do corpo (pode ser
 *              qualquer coisa — vem de fora, não é confiável).
 * @param ip    IP do visitante (app/lib/rate-limit.ts `clientIp`). Enviado
 *              como `remoteip` só quando existe de verdade; é opcional na
 *              API e serve para a Cloudflare correlacionar o desafio.
 */
export async function verifyTurnstile(token: unknown, ip?: string): Promise<TurnstileVerdict> {
  const secret = resolveSecret();
  if (!secret) return { ok: false, reason: "nao-configurado" };

  if (typeof token !== "string" || token.trim() === "") {
    return { ok: false, reason: "token-ausente" };
  }
  if (token.length > MAX_TURNSTILE_TOKEN_LENGTH) {
    // Não gastamos uma chamada de rede com isto: token legítimo não passa do
    // máximo documentado pela Cloudflare.
    return { ok: false, reason: "token-invalido", detail: "token acima do tamanho maximo" };
  }

  // form-urlencoded (e não JSON) porque é o formato dos exemplos oficiais da
  // Cloudflare e o que o endpoint aceita há mais tempo — os dois funcionam.
  const form = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "sem-ip") form.set("remoteip", ip);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const response = await fetch(SITEVERIFY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, reason: "indisponivel", detail: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data?.success === true) return { ok: true };

    return { ok: false, reason: "token-invalido", codes: data?.["error-codes"] ?? [] };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, reason: "indisponivel", detail: "timeout" };
    }
    // Também cai aqui um JSON de resposta malformado. Em qualquer um desses
    // casos NÃO sabemos se o visitante é gente — e "não sei" resolve para
    // "não passa" (ver nota de modo de falha no fim do arquivo).
    return {
      ok: false,
      reason: "indisponivel",
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/* --------------------------------------------------------------------------
   Nota de modo de falha (leia antes de "consertar" isto num incidente):

   Se o `siteverify` da Cloudflare estiver fora do ar ou inalcançável a partir
   do Worker, `verifyTurnstile` devolve `indisponivel` e a rota RECUSA o envio
   (503). É deliberado: é a mesma postura de negar por padrão do resto do
   projeto, e o custo de errar para o outro lado é assimétrico — deixar passar
   durante a indisponibilidade é abrir de novo, sem aviso, o caminho de
   queimar a cota de e-mail.

   O que segura o prejuízo desse cenário é o desenho da página, não este
   arquivo: o formulário mostra a falha e aponta para o WhatsApp, que é o
   canal preferido da clínica de qualquer forma, e o WhatsApp não depende de
   nada disto. Se um dia isso se mostrar frequente o bastante para incomodar
   (o log `lead_turnstile_indisponivel` é o que responde essa pergunta), a
   conversa a ter é "aceitar o envio mas NÃO disparar o e-mail" — e não
   "aceitar tudo", que joga fora a proteção inteira.
   -------------------------------------------------------------------------- */
