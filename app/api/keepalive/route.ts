import { NextResponse } from "next/server";
import { keepaliveSecret } from "../../lib/env";
import { checkRateLimit, clientIp } from "../../lib/rate-limit";
import { createServiceRoleClient } from "../../lib/supabase/admin";

/* ==========================================================================
   GET|POST /api/keepalive — impede a pausa por inatividade do Supabase
   ==========================================================================
   O PROBLEMA
   ----------
   Projeto Supabase no plano free é pausado depois de 7 dias sem atividade.
   Despausar é manual, no painel, e leva minutos. Num site de clínica local
   isso é bem provável: uma semana sem nenhum lead é normal. Se acontecer, o
   formulário quebra justamente para o primeiro visitante depois do silêncio
   — o pior lead possível de se perder.

   O QUE ESTA ROTA FAZ
   -------------------
   Uma consulta trivial e barata (contagem de linhas, sem trazer nenhuma), só
   para o projeto registrar atividade. Devolve `{ ok: true }` e nada mais —
   nem o número de leads, que é informação de negócio e não tem por que ser
   legível por quem chamar a URL.

   >>> PARA `devops` <<<
   Falta o agendamento: um Cloudflare Cron Trigger DIÁRIO chamando esta rota
   (diário, não semanal — assim há 6 tentativas de folga antes de o prazo de 7
   dias estourar). A requisição precisa mandar o segredo:

       GET /api/keepalive
       Authorization: Bearer $KEEPALIVE_SECRET

   (ou o header `x-keepalive-secret`, se for mais prático no Worker).
   Configure também um alerta quando o cron falhar — um keep-alive que morre
   em silêncio é pior que não ter keep-alive, porque ninguém desconfia.

   POR QUE EXIGE SEGREDO
   ---------------------
   Sem ele, a rota é um botão público que faz o site abrir conexão com o
   banco quantas vezes alguém quiser. O custo por chamada é ridículo, mas
   quota de plano free é finita e não há motivo para deixar aberto. Se o
   segredo não estiver configurado, a rota nega (401) do mesmo jeito que
   nega um segredo errado — negar por padrão vale aqui também, e não revelar
   pra quem não tem credencial se a rota já foi configurada ou não. A
   distinção fica só no log do servidor, que é onde devops confere na
   primeira execução do cron.
   ========================================================================== */

const RATE_LIMIT = { limit: 10, windowMs: 60 * 1000 };

/** Comparação em tempo constante, para não vazar o segredo por timing. */
function secretsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function providedSecret(request: Request): string {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return request.headers.get("x-keepalive-secret")?.trim() ?? "";
}

async function handle(request: Request) {
  const noStore = { "Cache-Control": "no-store" };

  const decision = await checkRateLimit(`keepalive:${clientIp(request)}`, RATE_LIMIT);
  if (!decision.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate limit" },
      { status: 429, headers: { ...noStore, "Retry-After": String(decision.retryAfterSeconds) } },
    );
  }

  // SEGURANÇA: resposta uniforme (401) tanto pra "segredo não configurado"
  // quanto pra "segredo errado" — a versão anterior respondia 503 distinto
  // pro primeiro caso, o que deixava um prober sem credencial nenhuma
  // descobrir o estado do deploy de graça. A distinção só vai pro log.
  const expected = keepaliveSecret() ?? "";
  const valido = expected.length > 0 && secretsMatch(providedSecret(request), expected);
  if (!valido) {
    if (!expected) {
      console.error(JSON.stringify({ evento: "keepalive_sem_segredo_configurado" }));
    }
    return NextResponse.json(
      { ok: false, error: "keepalive: não autorizado" },
      { status: 401, headers: noStore },
    );
  }

  try {
    const supabase = createServiceRoleClient();
    // head: true -> só o HEAD da consulta; nenhuma linha trafega. É a forma
    // mais barata de tocar o banco de verdade (um SELECT count sobre um
    // índice), e não um ping que só provaria que o Next está de pé.
    const { error } = await supabase.from("leads").select("id", { head: true, count: "exact" });

    if (error) {
      console.error(
        JSON.stringify({ evento: "keepalive_erro", codigo: error.code, mensagem: error.message }),
      );
      return NextResponse.json(
        { ok: false, error: "keepalive: banco indisponível" },
        { status: 502, headers: noStore },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: noStore });
  } catch (err) {
    console.error(
      JSON.stringify({ evento: "keepalive_excecao", detalhe: err instanceof Error ? err.message : String(err) }),
    );
    return NextResponse.json(
      { ok: false, error: "keepalive: falha inesperada" },
      { status: 500, headers: noStore },
    );
  }
}

// GET e POST fazem o mesmo: GET é o que um cron/monitor externo usa por
// padrão; POST fica disponível para quem preferir não expor a chamada em
// log de acesso com querystring.
export const GET = handle;
export const POST = handle;
