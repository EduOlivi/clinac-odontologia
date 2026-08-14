import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ==========================================================================
   Testes de integração leve de POST /api/leads — SEM Supabase/Resend reais
   ==========================================================================
   O QUE ISTO COBRE (e por que é o teste mais importante do repo)
   ----------------------------------------------------------------
   Esta é a rota que decide se um pedido de agendamento vira um lead
   salvo. Os testes abaixo chamam o handler `POST` de verdade (não é teste
   de UI, não é mock da rota) e verificam o contrato completo: content-type,
   rate limit, honeypot, e — o item não-negociável — que o servidor recusa
   um envio sem consentimento_lgpd mesmo que ele chegue por fora do
   formulário do site (ex.: um POST direto, sem passar pelo checkbox
   `required` do HTML, que é só UX).

   O QUE ISTO NÃO COBRE (e por quê)
   ---------------------------------
   `createServiceRoleClient` (Supabase) e `notifyNewLead` (Resend) são
   mockados — não existem credenciais reais de Supabase/Resend para este
   projeto ainda (ver README, seção de pendências), e mesmo que existissem,
   um teste automatizado não deveria gravar linhas de verdade num banco de
   produção a cada `npm test`. O que SE testa aqui é o comportamento da rota
   diante de cada resultado possível desses dois lados (sucesso, erro,
   exceção) — a parte que é código deste projeto. A verificação de que o
   Supabase real aceita o INSERT e as RLS policies aplicam corretamente
   fica para supabase/tests/rls_leads.test.sql (ver relatório de qa) e para
   um teste manual ponta-a-ponta assim que o dono do site criar as contas.

   O TURNSTILE TAMBÉM É MOCKADO — mas o que se testa dele é ORDEM, não a
   criptografia da Cloudflare
   -------------------------------------------------------------------------
   A chamada ao `siteverify` é interceptada no `globalThis.fetch`. O teste
   que mais importa neste arquivo hoje é "Resend NÃO é chamado quando o
   Turnstile falha": o achado de segurança que motivou o widget é que ~100
   requisições roteirizadas queimam a cota diária de e-mail do plano free do
   Resend. Se alguém mover a verificação do Turnstile para depois do disparo
   do e-mail, o código continua "funcionando" e a proteção some inteira —
   esse teste é o que trava isso.
   ========================================================================== */

const insertMock = vi.fn();
const notifyNewLeadMock = vi.fn();
/** Substitui `globalThis.fetch` — a única chamada de rede da rota é o siteverify. */
const fetchMock = vi.fn();

vi.mock("../../lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({
    from: () => ({ insert: insertMock }),
  }),
}));

vi.mock("../../lib/notify", () => ({
  notifyNewLead: (...args: unknown[]) => notifyNewLeadMock(...args),
}));

const { POST } = await import("./route");
const { TURNSTILE_TOKEN_FIELD } = await import("../../lib/leads");

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Formato do token de teste da Cloudflare (`XXXX.DUMMY.TOKEN.XXXX`). */
const TOKEN_VALIDO = "XXXX.DUMMY.TOKEN.XXXX";

const VALID_BODY = {
  nome: "Maria da Silva",
  telefone: "31 99999-0000",
  melhor_horario: "Manhã",
  tratamento: "Ortodontia",
  consentimento_lgpd: true,
  consentimento_marketing: false,
  politica_versao: "PRIVACIDADE v1.0 - 2026-08-13",
  _gotcha: "",
  [TURNSTILE_TOKEN_FIELD]: TOKEN_VALIDO,
};

/**
 * Faz o siteverify mockado responder aprovando/reprovando, no formato
 * documentado pela Cloudflare.
 *
 * `mockImplementation` e não `mockResolvedValue` de propósito: o corpo de um
 * `Response` só pode ser lido UMA vez. Reaproveitar o mesmo objeto entre
 * chamadas faz a segunda estourar com "Body has already been read" — que a
 * rota, corretamente, interpreta como "não consegui verificar" e responde
 * 503. Cada chamada precisa de um Response novo.
 */
function mockSiteverify(success: boolean, errorCodes: string[] = []) {
  fetchMock.mockImplementation(async () =>
    new Response(JSON.stringify({ success, "error-codes": errorCodes }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
}

/** Quantas vezes a rota chamou o siteverify (o resto do fetch é erro de teste). */
function siteverifyCalls(): number {
  return fetchMock.mock.calls.filter((call) => String(call[0]) === SITEVERIFY_URL).length;
}

let ipCounter = 0;
/** Cada teste usa um IP próprio para não esbarrar no rate limit de outro teste. */
function freshIp(): string {
  ipCounter += 1;
  return `10.0.0.${ipCounter}`;
}

function makeRequest(body: unknown, opts: { ip?: string; contentType?: string; rawBody?: string } = {}) {
  const ip = opts.ip ?? freshIp();
  return new Request("https://clinac.example.com/api/leads", {
    method: "POST",
    headers: {
      "content-type": opts.contentType ?? "application/json",
      "cf-connecting-ip": ip,
    },
    body: opts.rawBody ?? JSON.stringify(body),
  });
}

beforeEach(() => {
  insertMock.mockReset();
  notifyNewLeadMock.mockReset();
  fetchMock.mockReset();
  insertMock.mockResolvedValue({ error: null });
  notifyNewLeadMock.mockResolvedValue({ sent: true });

  // Chave secreta explícita: sem ela, app/lib/turnstile.ts cairia na chave de
  // TESTE da Cloudflare fora de produção e o teste dependeria desse fallback
  // (e de uma chamada de rede real) em vez de testar a rota.
  vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");

  // Padrão: Turnstile aprova. Cada teste que precisa do contrário sobrescreve.
  mockSiteverify(true);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/leads — consentimento LGPD (caminho não-negociável)", () => {
  it("recusa com 422 quando consentimento_lgpd está ausente do corpo — MESMO vindo de fora do formulário do site", async () => {
    const { consentimento_lgpd, ...rest } = VALID_BODY;
    void consentimento_lgpd;

    const response = await POST(makeRequest(rest));
    const json = (await response.json()) as { ok: boolean; error: string };

    expect(response.status).toBe(422);
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/autorizar o tratamento dos seus dados/i);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("recusa com 422 quando consentimento_lgpd é false", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, consentimento_lgpd: false }));
    expect(response.status).toBe(422);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("aceita e insere quando consentimento_lgpd é true", async () => {
    const response = await POST(makeRequest(VALID_BODY));
    const json = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(201);
    expect(json.ok).toBe(true);
    expect(insertMock).toHaveBeenCalledTimes(1);
    const insertedRow = insertMock.mock.calls[0][0];
    expect(insertedRow.consentimento_lgpd).toBe(true);
    expect(insertedRow.nome).toBe("Maria da Silva");
  });
});

describe("POST /api/leads — contrato HTTP", () => {
  it("recusa Content-Type que não é application/json com 415", async () => {
    const response = await POST(makeRequest(VALID_BODY, { contentType: "text/plain" }));
    expect(response.status).toBe(415);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("recusa JSON malformado com 400", async () => {
    const response = await POST(makeRequest(null, { rawBody: "{ isso não é json" }));
    expect(response.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("honeypot preenchido: responde 201 de sucesso, mas NÃO insere nem notifica", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, _gotcha: "sou um bot" }));
    const json = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(201);
    expect(json.ok).toBe(true);
    expect(insertMock).not.toHaveBeenCalled();
    expect(notifyNewLeadMock).not.toHaveBeenCalled();
  });

  it("recusa corpo maior que o teto (MAX_BODY_BYTES) com 413, sem tentar fazer JSON.parse nele", async () => {
    const oversized = JSON.stringify({ ...VALID_BODY, nome: "A".repeat(5000) });
    const response = await POST(makeRequest(null, { rawBody: oversized }));
    expect(response.status).toBe(413);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("bloqueia com 429 depois de exceder o limite de envios do mesmo IP", async () => {
    const ip = freshIp();
    // O limite hoje é 5 por 10 min (ver RATE_LIMIT em route.ts). Manda 5 (ok)
    // + 1 (deve estourar) usando o MESMO ip de propósito.
    for (let i = 0; i < 5; i++) {
      const response = await POST(makeRequest(VALID_BODY, { ip }));
      expect(response.status).toBe(201);
    }
    const sixth = await POST(makeRequest(VALID_BODY, { ip }));
    expect(sixth.status).toBe(429);
    expect(sixth.headers.get("Retry-After")).not.toBeNull();
  });
});

describe("POST /api/leads — Turnstile (o portão que protege a cota de e-mail)", () => {
  it("recusa com 403 quando o token não vem no corpo — e NÃO chama o Resend nem o banco", async () => {
    const semToken = { ...VALID_BODY };
    delete (semToken as Record<string, unknown>)[TURNSTILE_TOKEN_FIELD];

    const response = await POST(makeRequest(semToken));
    const json = (await response.json()) as { ok: boolean; error: string; code: string };

    expect(response.status).toBe(403);
    expect(json.ok).toBe(false);
    expect(json.code).toBe("desafio");
    // ESTE é o ponto do achado de segurança: um envio sem desafio custa zero
    // e-mail. Se este expect quebrar, a proteção contra queimar a cota do
    // Resend com ~100 requisições roteirizadas foi desfeita.
    expect(notifyNewLeadMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
    // Token ausente nem chega a virar chamada de rede.
    expect(siteverifyCalls()).toBe(0);
  });

  it("recusa com 403 quando o token vem vazio", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, [TURNSTILE_TOKEN_FIELD]: "   " }));
    expect(response.status).toBe(403);
    expect(notifyNewLeadMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("recusa com 403 quando o Cloudflare reprova o token — sem chamar o Resend", async () => {
    mockSiteverify(false, ["invalid-input-response"]);

    const response = await POST(makeRequest(VALID_BODY));
    const json = (await response.json()) as { ok: boolean; error: string; code: string };

    expect(response.status).toBe(403);
    expect(json.code).toBe("desafio");
    // O motivo interno da Cloudflare (`invalid-input-response`) fica só no
    // log: devolvê-lo transformaria a rota num oráculo de "qual filtro
    // preciso contornar".
    expect(json.error).not.toMatch(/invalid-input-response/);
    expect(siteverifyCalls()).toBe(1);
    expect(notifyNewLeadMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("recusa um token replayado (timeout-or-duplicate) — token é de uso único", async () => {
    mockSiteverify(false, ["timeout-or-duplicate"]);

    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(403);
    expect(notifyNewLeadMock).not.toHaveBeenCalled();
  });

  it("recusa sem gastar chamada de rede quando o token passa do tamanho máximo documentado", async () => {
    const enorme = "a".repeat(2049);
    const response = await POST(makeRequest({ ...VALID_BODY, [TURNSTILE_TOKEN_FIELD]: enorme }));

    expect(response.status).toBe(403);
    expect(siteverifyCalls()).toBe(0);
    expect(notifyNewLeadMock).not.toHaveBeenCalled();
  });

  it("responde 503 (não 403) quando o siteverify está inalcançável — e ainda assim não notifica", async () => {
    fetchMock.mockRejectedValue(new Error("falha de rede simulada"));

    const response = await POST(makeRequest(VALID_BODY));
    const json = (await response.json()) as { ok: boolean; code: string };

    // 503 e não 403 de propósito: refazer o desafio não resolveria nada,
    // o problema é do nosso lado. Ver a nota de modo de falha em
    // app/lib/turnstile.ts.
    expect(response.status).toBe(503);
    expect(json.code).toBe("indisponivel");
    expect(notifyNewLeadMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("aceita, grava e notifica quando o token é aprovado", async () => {
    const response = await POST(makeRequest(VALID_BODY));

    expect(response.status).toBe(201);
    expect(siteverifyCalls()).toBe(1);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(notifyNewLeadMock).toHaveBeenCalledTimes(1);
  });

  it("manda para o siteverify o token recebido e o IP do visitante", async () => {
    await POST(makeRequest(VALID_BODY, { ip: "203.0.113.7" }));

    const call = fetchMock.mock.calls.find((c) => String(c[0]) === SITEVERIFY_URL);
    expect(call).toBeDefined();
    const init = call?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    const enviado = new URLSearchParams(String(init.body));
    expect(enviado.get("response")).toBe(TOKEN_VALIDO);
    expect(enviado.get("remoteip")).toBe("203.0.113.7");
    expect(enviado.get("secret")).toBeTruthy();
  });

  it("o honeypot continua curto-circuitando ANTES do Turnstile (bot burro não gasta nem a chamada)", async () => {
    const response = await POST(makeRequest({ ...VALID_BODY, _gotcha: "sou um bot" }));

    expect(response.status).toBe(201); // sucesso falso, de propósito
    expect(siteverifyCalls()).toBe(0);
    expect(insertMock).not.toHaveBeenCalled();
    expect(notifyNewLeadMock).not.toHaveBeenCalled();
  });

  it("o rate limit continua barrando ANTES do Turnstile", async () => {
    const ip = freshIp();
    for (let i = 0; i < 5; i++) {
      expect((await POST(makeRequest(VALID_BODY, { ip }))).status).toBe(201);
    }
    const chamadasAntes = siteverifyCalls();
    const sexta = await POST(makeRequest(VALID_BODY, { ip }));

    expect(sexta.status).toBe(429);
    expect(siteverifyCalls()).toBe(chamadasAntes); // nenhuma chamada nova
  });

  it("nega o envio quando TURNSTILE_SECRET_KEY não está configurada em produção", async () => {
    // Sem a chave secreta E em produção, a postura é NEGAR — deixar passar
    // recriaria em silêncio exatamente o buraco que o Turnstile fecha. A
    // consequência (formulário fora do ar até a chave ser cadastrada) está
    // documentada em app/lib/turnstile.ts e em docs/DEPLOY.md.
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST(makeRequest(VALID_BODY));
    const json = (await response.json()) as { ok: boolean; code: string };

    expect(response.status).toBe(503);
    expect(json.code).toBe("indisponivel");
    expect(siteverifyCalls()).toBe(0);
    expect(notifyNewLeadMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/leads — falhas de dependência externa", () => {
  it("responde 503 quando o insert no Supabase falha (o lead não pode desaparecer em silêncio)", async () => {
    insertMock.mockResolvedValue({ error: { code: "23505", message: "erro simulado" } });

    const response = await POST(makeRequest(VALID_BODY));
    const json = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(503);
    expect(json.ok).toBe(false);
  });

  it("ainda responde 201 quando o e-mail de notificação falha, desde que o insert tenha funcionado", async () => {
    notifyNewLeadMock.mockResolvedValue({ sent: false, reason: "erro-do-provedor", detail: "HTTP 500" });

    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(201);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it("ainda responde 201 quando notifyNewLead lança uma exceção (não deve derrubar a requisição)", async () => {
    notifyNewLeadMock.mockRejectedValue(new Error("falha de rede simulada"));

    const response = await POST(makeRequest(VALID_BODY));
    expect(response.status).toBe(201);
  });
});
