import { NextResponse } from "next/server";
import { MAX_BODY_BYTES, TURNSTILE_TOKEN_FIELD, validateLeadPayload } from "../../lib/leads";
import { checkRateLimit, clientIp } from "../../lib/rate-limit";
import { createServiceRoleClient } from "../../lib/supabase/admin";
import { verifyTurnstile } from "../../lib/turnstile";

/* ==========================================================================
   POST /api/leads — recebe o formulário de agendamento
   ==========================================================================
   Contrato (implementado do outro lado por app/components/BookingForm.tsx):

     Entrada  { nome, telefone, melhor_horario, tratamento,
                consentimento_lgpd, consentimento_marketing,
                politica_versao, _gotcha,
                "cf-turnstile-response" }   <- token do Cloudflare Turnstile
     Sucesso  2xx { ok: true }
     Falha    4xx/5xx { ok: false, error: string, code: string }

   `error` é concatenado pelo frontend com uma frase genérica que já sugere o
   WhatsApp — por isso as mensagens daqui são curtas e não repetem isso.

   `code` é um rótulo estável, legível por máquina, presente em TODA resposta
   de falha (não só em algumas): é o que permite ao formulário reagir de forma
   diferente a "refaça o desafio anti-robô" e a "corrija o telefone" sem ter
   que casar string de mensagem. Ele é deliberadamente uniforme e grosso —
   nenhum `code` carrega o motivo interno da recusa (por exemplo, os
   `error-codes` que o Cloudflare devolve ficam SÓ no log do servidor), para
   não transformar esta rota num oráculo que um atacante usa para descobrir,
   tentativa a tentativa, qual filtro ele precisa contornar. O honeypot segue
   a mesma linha por outro caminho: responde SUCESSO.

   Esta rota é o ÚNICO caminho de escrita na tabela `leads`: não existe policy
   de INSERT para `anon` nem para `authenticated`. É o oposto do desenho
   anterior do site, em que o endpoint do formulário era público e qualquer
   pessoa podia postar nele direto.

   NÃO HÁ AVISO POR E-MAIL: decisão da clínica (2026-08-20, ver
   app/lib/leads.ts, changelog de CURRENT_POLICY_VERSION) de usar só o
   WhatsApp — o botão "Confirmar pelo WhatsApp" em BookingForm.tsx, que o
   próprio visitante decide enviar. O lead salvo aqui continua sendo a fonte
   confiável, sempre visível no painel /admin/leads.
   ========================================================================== */

/** 5 envios por IP a cada 10 min. Um paciente real manda 1; um bot, milhares. */
const RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

/**
 * Rótulos de falha devolvidos no campo `code`. Manter em sincronia com
 * app/components/BookingForm.tsx, que hoje só trata `desafio` de forma
 * especial e cai no genérico para o resto.
 */
type FailCode =
  | "formato" // content-type/JSON/corpo que não dá para interpretar
  | "limite" // rate limit
  | "grande" // corpo acima do teto
  | "desafio" // Turnstile ausente ou reprovado — o visitante pode refazer
  | "validacao" // campo inválido / falta consentimento
  | "indisponivel"; // dependência nossa falhou (banco, siteverify, configuração)

function fail(status: number, code: FailCode, error: string, extraHeaders?: HeadersInit) {
  return NextResponse.json(
    { ok: false, error, code },
    { status, headers: { "Cache-Control": "no-store", ...extraHeaders } },
  );
}

function success() {
  return NextResponse.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  // ---- 1. Content-Type ------------------------------------------------
  // Recusar o que não é JSON derruba de graça o bot que posta form-urlencoded
  // "no chute" e evita CORS simples vindo de outra origem.
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return fail(415, "formato", "Formato de envio inválido.");
  }

  // ---- 2. Rate limit --------------------------------------------------
  // Antes de ler o corpo, para não gastar CPU com quem já está no limite.
  // ATENÇÃO: em Cloudflare Workers isto é best-effort (contador por isolate).
  // Ver o comentário de topo de app/lib/rate-limit.ts — é uma limitação
  // conhecida, com a dependência para devops descrita lá.
  const ip = clientIp(request);
  const decision = await checkRateLimit(`leads:${ip}`, RATE_LIMIT);
  if (!decision.allowed) {
    return fail(429, "limite", "Recebemos vários envios deste dispositivo. Aguarde alguns minutos.", {
      "Retry-After": String(decision.retryAfterSeconds),
    });
  }

  // ---- 3. Corpo com teto de tamanho -----------------------------------
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return fail(413, "grande", "Envio grande demais.");
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return fail(400, "formato", "Não foi possível ler o envio.");
  }
  // Confere de novo pelo tamanho real: content-length é informado pelo
  // cliente e pode mentir (ou nem vir, em chunked).
  if (raw.length > MAX_BODY_BYTES) {
    return fail(413, "grande", "Envio grande demais.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail(400, "formato", "Formato de envio inválido.");
  }

  // ---- 4. Honeypot ----------------------------------------------------
  // `_gotcha` é invisível para gente; só um bot que preenche tudo o que
  // encontra no HTML manda algo aí. Respondemos SUCESSO de propósito: um 4xx
  // ensinaria o bot que existe um filtro e o que evitar. Ele vai embora
  // achando que funcionou, e nada é gravado.
  const gotcha = (parsed as Record<string, unknown> | null)?._gotcha;
  if (typeof gotcha === "string" && gotcha.trim() !== "") {
    console.warn(JSON.stringify({ evento: "lead_honeypot", ip }));
    return success();
  }

  // ---- 5. Turnstile (o portão anti-bot de verdade) ---------------------
  // >>> A POSIÇÃO DESTE BLOCO É A DEFESA, NÃO SÓ A CHAMADA. <<<
  // Ele vem depois das checagens de graça (as de cima não custam nem uma
  // chamada de rede) e ANTES de validar e gravar. Um desafio ausente ou
  // reprovado precisa custar ZERO escrita no banco: o achado que motivou
  // este código é justamente que ~100 requisições roteirizadas conseguiam
  // sujar a tabela de leads e soterrar o painel /admin/leads (sem paginação
  // nem busca) com lixo, empurrando os leads reais para fora da tela. Ver
  // app/lib/turnstile.ts.
  //
  // Se você está movendo isto para baixo: não mova. Existe teste travando
  // (route.test.ts, "o insert NÃO é chamado quando o Turnstile falha").
  const turnstile = await verifyTurnstile(
    (parsed as Record<string, unknown> | null)?.[TURNSTILE_TOKEN_FIELD],
    ip,
  );
  if (!turnstile.ok) {
    console.warn(
      JSON.stringify({
        evento:
          turnstile.reason === "indisponivel"
            ? "lead_turnstile_indisponivel"
            : turnstile.reason === "nao-configurado"
              ? "lead_turnstile_nao_configurado"
              : "lead_turnstile_reprovado",
        motivo: turnstile.reason,
        // `codes`/`detail` ficam SÓ aqui, no log — devolvê-los ao cliente
        // entregaria de bandeja qual filtro ele precisa contornar.
        codes: turnstile.codes,
        detalhe: turnstile.detail,
        ip,
      }),
    );

    // Duas famílias de resposta, porque são dois problemas diferentes para
    // quem está do outro lado da tela:
    //   - `desafio` (403): a culpa é do token (faltou, expirou, já foi
    //     usado). Refazer o desafio resolve, e é isso que o formulário faz.
    //   - `indisponivel` (503): a culpa é nossa (chave não cadastrada, ou o
    //     siteverify inalcançável). Refazer o desafio não muda nada; o
    //     caminho que funciona é o WhatsApp, que a mensagem do formulário já
    //     sugere.
    if (turnstile.reason === "nao-configurado" || turnstile.reason === "indisponivel") {
      return fail(503, "indisponivel", "O envio pelo site está indisponível no momento.");
    }
    return fail(
      403,
      "desafio",
      "Não foi possível confirmar a verificação de segurança. Refaça a verificação abaixo.",
    );
  }

  // ---- 6. Validação (o servidor não confia no formulário) --------------
  const validation = validateLeadPayload(parsed);
  if (!validation.ok) {
    return fail(422, "validacao", validation.error);
  }
  const lead = validation.data;

  // ---- 7. Grava o lead ---------------------------------------------------
  // O id é gerado aqui (a coluna também tem default no banco) para que a
  // resposta e os logs abaixo possam citá-lo sem depender do retorno do
  // insert.
  const leadId = crypto.randomUUID();

  let insertFailure: { codigo?: string; mensagem: string } | null = null;
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("leads").insert({ id: leadId, ...lead });
    if (error) {
      // Log sem nome/telefone/tratamento: é dado pessoal (e de saúde), e log
      // de plataforma é lido por gente que não precisa vê-lo.
      insertFailure = { codigo: error.code, mensagem: error.message };
    }
  } catch (err) {
    // Cai aqui também quando falta configuração (SUPABASE_URL /
    // SUPABASE_SERVICE_ROLE_KEY ausentes) — melhor um 503 explicado que um
    // 500 genérico do framework.
    insertFailure = { mensagem: err instanceof Error ? err.message : String(err) };
  }

  if (insertFailure) {
    console.error(JSON.stringify({ evento: "lead_insert_erro", leadId, ...insertFailure }));
    return fail(503, "indisponivel", "Houve uma falha ao registrar seu pedido.");
  }

  console.info(JSON.stringify({ evento: "lead_criado", leadId }));
  return success();
}

/* --------------------------------------------------------------------------
   Nota de modo de falha (para quem for depurar um dia):

   Se o projeto Supabase estiver PAUSADO por inatividade, o insert falha e o
   usuário vê erro — o pedido não fica salvo em lugar nenhum. O keep-alive
   (app/api/keepalive/route.ts) existe justamente para esse cenário não
   acontecer. O visitante sempre tem o WhatsApp como caminho alternativo
   (o botão flutuante e o "Confirmar pelo WhatsApp" pós-envio não dependem
   desta rota).
   -------------------------------------------------------------------------- */
