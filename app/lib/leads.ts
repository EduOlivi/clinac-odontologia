/* ==========================================================================
   Tipos e validação do lead — compartilhado entre a rota /api/leads e o
   painel /admin/leads.
   ==========================================================================
   Este arquivo NÃO importa "server-only": ele não toca em segredo nenhum, é
   só formato de dado. Os limites de tamanho aqui espelham os CHECK
   constraints de supabase/migrations/20260814120000_leads.sql — mudou um,
   muda o outro.

   Por que validar tamanho e não só "existe": a revisão de segurança anterior
   deste projeto apontou que um POST direto na rota (o formulário do site não
   é o único cliente possível) pode mandar um "nome" de 10 KB. Sem limite,
   isso vira lixo no banco de 500 MB do plano free. O banco também barra —
   mas barrar aqui devolve uma mensagem útil em vez de um erro 500 do
   Postgres.
   ========================================================================== */

/**
 * Opções válidas de "tratamento de interesse" — única fonte de verdade,
 * usada tanto pelo <select> em BookingForm.tsx quanto pela validação do
 * servidor abaixo. Antes existiam duas listas (uma em cada arquivo); um POST
 * direto na rota podia mandar qualquer string nesse campo, que é dado de
 * saúde (LGPD art. 11) mostrado sem escape adicional no painel da equipe —
 * texto arbitrário de um atacante ali é superfície de phishing pra quem
 * administra, não só "sujeira" no banco.
 */
export const TREATMENT_OPTIONS = [
  "Limpeza & Prevenção",
  "Clareamento Dental",
  "Ortodontia",
  "Implantodontia",
  "Odontopediatria",
  "Lentes de Contato Dental",
  "Ainda não sei",
] as const;

/**
 * Abertura personalizada por tratamento — usada em BookingForm.tsx pra
 * montar a mensagem pré-preenchida do "Confirmar pelo WhatsApp" depois do
 * envio (ver app/lib/site-config.ts, buildWhatsAppUrl). Mesma fonte única
 * de TREATMENT_OPTIONS: uma chave por opção, `Record` obriga o TypeScript a
 * acusar erro em tempo de build se alguém adicionar um tratamento novo e
 * esquecer de escrever a frase correspondente aqui.
 */
export const TREATMENT_WHATSAPP_INTRO: Record<(typeof TREATMENT_OPTIONS)[number], string> = {
  "Limpeza & Prevenção": "gostaria de agendar uma limpeza e avaliação preventiva",
  "Clareamento Dental": "tenho interesse em fazer um clareamento dental",
  Ortodontia: "tenho interesse em iniciar um tratamento ortodôntico (aparelho)",
  Implantodontia: "gostaria de agendar uma avaliação para implante dentário",
  Odontopediatria: "gostaria de agendar uma consulta odontopediátrica",
  "Lentes de Contato Dental": "tenho interesse em lentes de contato dental (facetas)",
  "Ainda não sei": "gostaria de agendar uma avaliação para saber qual tratamento preciso",
};

/**
 * Versão da política de privacidade vigente — constante do SERVIDOR, não
 * lida do campo oculto enviado pelo cliente. O campo oculto em
 * BookingForm.tsx existe só para o humano ver no dev tools; um POST direto
 * podia escrever qualquer string nesse campo, que é o registro de qual
 * versão da política o titular aceitou (LGPD art. 8º §2º) — não pode ficar
 * sob controle de quem está enviando o dado.
 *
 * >>> QUANDO BUMPAR (regra de compliance, não de código) <<<
 * Sempre que a SUBSTÂNCIA de PRIVACIDADE.md mudar — quem trata os dados, para
 * onde eles vão, por quanto tempo ficam, ou com que base legal. Não bumpe por
 * correção de vírgula. O ponto é que consentimentos já gravados continuem
 * apontando para o texto que aquelas pessoas efetivamente leram; se a versão
 * não muda, um registro antigo passa a "apontar" para um texto novo que o
 * titular nunca viu, e a trilha de consentimento deixa de provar o que
 * deveria provar.
 *
 * Ao bumpar, mude JUNTO, no mesmo commit:
 *   - PRIVACIDADE.md e app/privacidade/page.tsx (data + número da versão);
 *   - o `value` do input escondido `politica_versao` em BookingForm.tsx.
 *
 * v1.0 (2026-08-13): site estático, formulário via Formspree (EUA).
 * v2.0 (2026-08-14): Cloudflare Workers + Supabase + Resend + R2 + Turnstile;
 *                    Formspree removida do fluxo; prazo de retenção definido
 *                    em 12 meses; lista de operadores e seção de transferência
 *                    internacional reescritas.
 * v2.1 (2026-08-20): Resend removido — decisão da clínica de não usar aviso
 *                    por e-mail. Adicionado o botão "Confirmar pelo
 *                    WhatsApp" pós-envio (link wa.me com mensagem
 *                    pré-preenchida, sem nenhuma API/automação por trás —
 *                    é o visitante quem manda, se quiser).
 */
export const CURRENT_POLICY_VERSION = "PRIVACIDADE v2.1 - 2026-08-20";

export const LEAD_STATUSES = ["novo", "contatado", "agendado", "compareceu"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  agendado: "Agendado",
  compareceu: "Compareceu",
};

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value);
}

export type Lead = {
  id: string;
  created_at: string;
  atualizado_em: string;
  nome: string;
  telefone: string;
  melhor_horario: string | null;
  tratamento: string;
  consentimento_lgpd: boolean;
  consentimento_marketing: boolean;
  politica_versao: string;
  status: LeadStatus;
};

/** Payload já validado, pronto para o insert. */
export type LeadInput = {
  nome: string;
  telefone: string;
  melhor_horario: string | null;
  tratamento: string;
  consentimento_lgpd: true;
  consentimento_marketing: boolean;
  politica_versao: string;
};

/** Limites por campo — precisam bater com os CHECK constraints da migração. */
export const FIELD_LIMITS = {
  nome: { min: 2, max: 120 },
  telefone: { min: 8, max: 40 },
  melhorHorario: { max: 120 },
  tratamento: { min: 2, max: 80 },
  politicaVersao: { max: 80 },
} as const;

/**
 * Conjunto de caracteres aceitos em cada campo — fonte única, tanto pro
 * `test()` de validação (âncorado com ^...$) quanto pro filtro "ao digitar"
 * de BookingForm.tsx (mesma classe, sem âncora, negada com [^...] pra virar
 * "troque por vazio"). Escrever a classe só uma vez evita o mesmo risco já
 * encontrado numa revisão de segurança anterior: duas cópias (cliente e
 * servidor) que desalinham e abrem brecha.
 *
 * Nome: letra (com acento, qualquer alfabeto via \p{L}), espaço, hífen e
 * apóstrofo — cobre nome composto ("Maria-Clara") e sobrenome com apóstrofo
 * ("D'Ávila") sem abrir pra número/símbolo.
 *
 * Telefone: dígito + pontuação de formatação comum (espaço, parênteses,
 * hífen, "+" do +55) — bloqueia letra e qualquer símbolo fora desse
 * conjunto. A contagem mínima de dígitos reais é conferida à parte, depois
 * de tirar essa pontuação (ver validateLeadPayload).
 */
const NOME_CHARS = "\\p{L}\\s'-";
const TELEFONE_CHARS = "0-9()\\-\\s+";

/** `\p{L}` exige a flag `u` — por isso os dois regex abaixo levam `u`, mesmo o de telefone (que não usa `\p{L}`, mas não custa manter consistente). */
export const NOME_PATTERN = new RegExp(`^[${NOME_CHARS}]+$`, "u");
export const TELEFONE_PATTERN = new RegExp(`^[${TELEFONE_CHARS}]+$`, "u");

/** Usados por BookingForm.tsx no filtro "ao digitar" — troca por "" tudo que não estiver na classe acima. */
export const NOME_INVALID_CHARS = new RegExp(`[^${NOME_CHARS}]`, "gu");
export const TELEFONE_INVALID_CHARS = new RegExp(`[^${TELEFONE_CHARS}]`, "gu");

/**
 * "Melhor horário" deixou de ser texto livre — vira <select> restrito a
 * período dentro do funcionamento real da clínica (ver Footer.tsx: seg-qui
 * 8h-18h, sex 8h-15h). Única fonte de verdade, igual TREATMENT_OPTIONS
 * acima: usada pelo <select> em BookingForm.tsx e pela validação abaixo.
 */
export const MELHOR_HORARIO_OPTIONS = ["Manhã (8h às 12h)", "Tarde (12h às 18h)"] as const;

/**
 * Nome do campo que carrega o token do Cloudflare Turnstile no corpo JSON de
 * POST /api/leads. É exatamente o nome do input escondido que o próprio
 * widget injeta no formulário (`cf-turnstile-response`) — mantido igual de
 * propósito, para quem abrir o dev tools reconhecer de onde ele vem sem
 * precisar cruzar com a documentação da Cloudflare.
 *
 * Mora aqui (e não em app/lib/turnstile.ts) porque este arquivo é o contrato
 * de dado compartilhado entre cliente e servidor e NÃO importa "server-only":
 * app/components/BookingForm.tsx precisa da constante para montar o payload.
 */
export const TURNSTILE_TOKEN_FIELD = "cf-turnstile-response";

/**
 * Teto de tamanho do token do Turnstile. A Cloudflare documenta o token como
 * tendo no máximo 2048 caracteres — qualquer coisa maior que isso não é um
 * token, é alguém tentando fazer o servidor gastar uma chamada de rede (ou
 * CPU) com lixo. Barrar antes do `siteverify` é de graça.
 */
export const MAX_TURNSTILE_TOKEN_LENGTH = 2048;

/**
 * Teto do corpo da requisição, aplicado ANTES do JSON.parse na rota.
 * Os campos preenchidos por gente somam pouco mais de 400 bytes; o token do
 * Turnstile acrescenta até 2 KB (ver acima), então o pior caso legítimo fica
 * em ~2,5 KB. 4 KB continua deixando folga e evita gastar CPU do Worker
 * desserializando um megabyte de lixo.
 *
 * Se um dia este teto encostar no limite: o certo é subir ESTE número, não
 * afrouxar o teto do token — o token é o único campo aqui cujo tamanho não
 * está sob controle deste projeto.
 */
export const MAX_BODY_BYTES = 4 * 1024;

export type ValidationResult = { ok: true; data: LeadInput } | { ok: false; error: string };

/**
 * Normaliza: vira string, sem caractere de controle, sem espaço duplicado,
 * sem espaço nas pontas.
 *
 * O filtro de caracteres de controle é feito por code point (e não por regex
 * com escapes) porque o Postgres recusa o byte NUL em colunas `text` (erro
 * 22021) — isso viraria um 500 sem explicação — e porque o resto dos
 * controles só serve para bagunçar o painel.
 */
function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    out += code < 32 || code === 127 ? " " : ch;
  }
  return out.replace(/\s+/g, " ").trim();
}

/**
 * Valida o corpo de POST /api/leads.
 *
 * NÃO trata o honeypot `_gotcha` — isso é decidido na rota, porque a resposta
 * para bot é diferente (sucesso falso) da resposta para erro real.
 */
export function validateLeadPayload(raw: unknown): ValidationResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Formato de envio inválido." };
  }

  const body = raw as Record<string, unknown>;

  const nome = clean(body.nome);
  const telefone = clean(body.telefone);
  const melhorHorario = clean(body.melhor_horario);
  const tratamento = clean(body.tratamento);

  // ---- Consentimento LGPD: quem decide é o servidor, não o cliente ----
  // O checkbox `required` do HTML é uma sugestão de UI — some com um devtools
  // aberto ou com um POST feito fora do site. Dado de saúde (LGPD art. 11)
  // sem consentimento registrado não entra no banco.
  if (body.consentimento_lgpd !== true) {
    return {
      ok: false,
      error: "É necessário autorizar o tratamento dos seus dados para solicitar a avaliação.",
    };
  }

  if (nome.length < FIELD_LIMITS.nome.min) {
    return { ok: false, error: "Informe seu nome completo." };
  }
  if (nome.length > FIELD_LIMITS.nome.max) {
    return { ok: false, error: `O nome excede o limite de ${FIELD_LIMITS.nome.max} caracteres.` };
  }
  if (!NOME_PATTERN.test(nome)) {
    return { ok: false, error: "O nome deve conter apenas letras (sem número ou símbolo)." };
  }

  if (telefone.length > FIELD_LIMITS.telefone.max) {
    return { ok: false, error: "O telefone informado é longo demais." };
  }
  if (!TELEFONE_PATTERN.test(telefone)) {
    return { ok: false, error: "O telefone deve conter apenas números (sem letra ou símbolo)." };
  }
  // Exigimos dígitos suficientes para ser discável no Brasil (DDD + 8 ou 9
  // dígitos, com folga para +55). Sem exigir um formato exato: "31 9 9999-0000"
  // e "31999990000" são igualmente válidos, só a pontuação já filtrada acima
  // (TELEFONE_PATTERN) e a contagem de dígitos importam.
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 10 || digitos.length > 13) {
    return { ok: false, error: "Informe um telefone com DDD (ex.: 31 99999-0000)." };
  }

  if (!(TREATMENT_OPTIONS as readonly string[]).includes(tratamento)) {
    return { ok: false, error: "Selecione um tratamento de interesse válido." };
  }

  if (melhorHorario !== "" && !(MELHOR_HORARIO_OPTIONS as readonly string[]).includes(melhorHorario)) {
    return { ok: false, error: "Selecione um período válido para o melhor horário de contato." };
  }

  // O `politica_versao` que o cliente mandou é IGNORADO de propósito — ver
  // comentário de CURRENT_POLICY_VERSION acima.

  return {
    ok: true,
    data: {
      nome,
      telefone,
      melhor_horario: melhorHorario === "" ? null : melhorHorario,
      tratamento,
      consentimento_lgpd: true,
      consentimento_marketing: body.consentimento_marketing === true,
      politica_versao: CURRENT_POLICY_VERSION,
    },
  };
}
