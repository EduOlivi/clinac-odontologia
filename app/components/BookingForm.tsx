"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { trackEvent } from "../lib/analytics";
// Única fonte de verdade da lista de tratamentos — compartilhada com a
// validação server-side em /api/leads (ver app/lib/leads.ts). Duas listas
// separadas (uma aqui, uma no servidor) já foram um achado de segurança:
// bastava desalinhar pra abrir brecha de validação.
import {
  MELHOR_HORARIO_OPTIONS,
  NOME_INVALID_CHARS,
  TELEFONE_INVALID_CHARS,
  TREATMENT_OPTIONS,
  TREATMENT_WHATSAPP_INTRO,
  TURNSTILE_TOKEN_FIELD,
} from "../lib/leads";
import { buildWhatsAppUrl } from "../lib/site-config";
import TurnstileWidget, { TEST_SITE_KEY_ALWAYS_PASSES } from "./TurnstileWidget";

type FeedbackState =
  | { type: "success"; message: string; whatsappUrl: string }
  | { type: "error"; message: string }
  | null;

const SUBMIT_TIMEOUT_MS = 15000;

/* --------------------------------------------------------------------------
   Sitekey do Turnstile

   `NEXT_PUBLIC_*` porque a sitekey É pública por definição do produto: a
   Cloudflare a descreve como "public key used to invoke the Turnstile widget
   on your site" e ela precisa estar no HTML para o widget existir. O que não
   pode vazar é a TURNSTILE_SECRET_KEY, que só o servidor lê (app/lib/env.ts,
   app/lib/turnstile.ts) e que nunca chega aqui.

   ATENÇÃO (deploy): o Next INLINA `NEXT_PUBLIC_*` no bundle do navegador em
   tempo de BUILD. Cadastrar esta variável só como `vars` do Worker (runtime)
   NÃO faz ela chegar ao navegador — ela precisa estar no ambiente que roda
   `next build`. Ver docs/DEPLOY.md, seção "Cloudflare Turnstile".

   Sem a variável, fora de produção caímos na sitekey de TESTE documentada
   pela Cloudflare (para `npm run dev` funcionar sem conta). Em produção
   NÃO há queda para chave de teste: sem sitekey não há widget, não há token,
   e o servidor recusa o envio — deliberado, ver app/lib/turnstile.ts.
   -------------------------------------------------------------------------- */
const CONFIGURED_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
const SITE_KEY =
  CONFIGURED_SITE_KEY ||
  (process.env.NODE_ENV === "production" ? "" : TEST_SITE_KEY_ALWAYS_PASSES);

/* ==========================================================
   Envio do formulário de agendamento
   ==========================================================
   Migrado do bloco "4) Envio do formulário de agendamento (Formspree, via
   AJAX)" de index.html. A integração com a Formspree foi REMOVIDA — será
   substituída pela rota própria POST /api/leads, com Supabase por trás,
   entregue pelo especialista `backend`. A UX do envio original foi
   preservada: timeout de rede, trava contra double-submit, mensagem de
   sucesso/erro com aria-live, e o mesmo evento de analytics disparado
   antes do reset() do formulário (para não perder o valor do <select>
   de tratamento).

   >>> CONTRATO DE POST /api/leads (implementado em app/api/leads/route.ts) <<<

   Request:
     Content-Type: application/json
     Body: {
       nome: string,
       telefone: string,
       melhor_horario: string,           // "" ou um dos valores de MELHOR_HORARIO_OPTIONS (campo opcional)
       tratamento: string,                // um dos valores de TREATMENT_OPTIONS acima
       consentimento_lgpd: boolean,       // deve ser true (checkbox obrigatório, dado de saúde — LGPD art. 11)
       consentimento_marketing: boolean,  // opcional
       politica_versao: string,           // versão da política aceita no momento do envio
       _gotcha: string,                   // honeypot — deve chegar vazio; se vier preenchido, é bot
       "cf-turnstile-response": string    // token do Cloudflare Turnstile (ver TURNSTILE_TOKEN_FIELD)
     }

   Response:
     - Sucesso: status 2xx, body { ok: true }
     - Falha:   status 4xx/5xx, body { ok: false, error: string, code: string }
                (`error` é mostrado ao usuário quando presente; `code` é um
                rótulo estável — hoje só `desafio` recebe tratamento próprio,
                ver handleSubmit abaixo)
   ========================================================== */

export default function BookingForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  // Token do Turnstile + contador que pede um token NOVO ao widget. Os dois
  // andam juntos porque o token é de uso único e vale 5 min: depois de cada
  // tentativa de envio (deu certo ou não) o que temos em mãos já não serve.
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);

  const handleTurnstileToken = useCallback((token: string | null) => {
    setTurnstileToken(token);
  }, []);

  // Filtra ENQUANTO digita (não só no submit) — o caractere inválido nunca
  // aparece no campo, em vez do usuário digitar e só descobrir no erro do
  // envio. Usa NOME_INVALID_CHARS/TELEFONE_INVALID_CHARS de app/lib/leads.ts
  // (mesma classe de caractere do NOME_PATTERN/TELEFONE_PATTERN que o
  // servidor usa pra validar de verdade) — isto aqui é só UX, não é a
  // validação que decide.
  const handleNomeInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.replace(NOME_INVALID_CHARS, "");
  }, []);
  const handleTelefoneInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.replace(TELEFONE_INVALID_CHARS, "");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return; // trava contra clique duplo / double-submit

    const form = formRef.current;
    if (!form) return;

    // Sem sitekey não existe widget nem token, e o servidor vai recusar de
    // qualquer forma — melhor dizer isso aqui do que gastar a viagem e
    // devolver um erro genérico. Só acontece em produção mal configurada
    // (ver SITE_KEY acima); em dev cai na chave de teste.
    if (!SITE_KEY) {
      setFeedback({
        type: "error",
        message:
          "O envio pelo site está indisponível no momento. Fale conosco pelo WhatsApp que respondemos por lá.",
      });
      return;
    }

    // Idem para o token ainda não resolvido: evita uma requisição que já
    // sabemos que volta 403.
    if (!turnstileToken) {
      setFeedback({
        type: "error",
        message:
          "Conclua a verificação de segurança abaixo do formulário e tente novamente. " +
          "Se ela não aparecer, fale conosco pelo WhatsApp.",
      });
      return;
    }

    const data = new FormData(form);
    const treatment = String(data.get("tratamento") ?? "");

    const payload = {
      nome: String(data.get("nome") ?? ""),
      telefone: String(data.get("telefone") ?? ""),
      melhor_horario: String(data.get("melhor_horario") ?? ""),
      tratamento: treatment,
      consentimento_lgpd: data.get("consentimento_lgpd") === "sim",
      consentimento_marketing: data.get("consentimento_marketing") === "sim",
      politica_versao: String(data.get("politica_versao") ?? ""),
      _gotcha: String(data.get("_gotcha") ?? ""),
      [TURNSTILE_TOKEN_FIELD]: turnstileToken,
    };

    setFeedback(null);
    setSending(true);

    // Timeout de rede: sem isso, uma conexão ruim deixa o botão travado em "Enviando…".
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const result: { ok?: boolean; error?: string; code?: string } | null = await response
        .json()
        .catch(() => null);

      if (response.ok && result?.ok) {
        // ORDEM IMPORTA: dispara o tracking ANTES do reset() de propósito — lê
        // o tratamento escolhido a partir de `treatment`, já capturado do
        // FormData acima, e não do DOM pós-reset (mesmo cuidado do script
        // original com o <select name="tratamento">).
        trackEvent("form_submit_success", {});
        if (treatment) {
          trackEvent("treatment_interest_selected", { treatment });
        }

        // Mensagem pré-preenchida do wa.me — montada com os valores JÁ
        // capturados em `payload`, então não depende do form.reset() logo
        // abaixo. O pedido em si já está salvo no Supabase nesse ponto
        // (é a fonte confiável, sempre visível no painel); isto aqui é só
        // um atalho pro visitante confirmar no canal que a equipe da
        // clínica realmente acompanha (pedido explícito da clínica,
        // 2026-08-20 — WhatsApp em vez de aviso por e-mail).
        const intro = TREATMENT_WHATSAPP_INTRO[treatment as keyof typeof TREATMENT_WHATSAPP_INTRO];
        const partesMensagem = [
          `Olá! Meu nome é ${payload.nome}${intro ? `, ${intro}` : ""}.`,
          payload.melhor_horario ? `Prefiro contato no período: ${payload.melhor_horario}.` : "",
          "Acabei de preencher o formulário no site.",
        ].filter(Boolean);
        const whatsappUrl = buildWhatsAppUrl(partesMensagem.join(" "));

        form.reset();
        setFeedback({
          type: "success",
          message: "Recebemos seu pedido! Confirme rapidinho pelo WhatsApp pra agilizar seu atendimento.",
          whatsappUrl,
        });
      } else if (result?.code === "desafio") {
        // Caso próprio de propósito: aqui o que falhou foi a verificação
        // anti-robô (token faltando, vencido ou já usado), e o que resolve é
        // refazer o desafio — não "tentar de novo" no sentido genérico. O
        // widget é resetado logo abaixo, no `finally`, então o visitante só
        // precisa esperar o quadradinho ficar verde de novo.
        setFeedback({
          type: "error",
          message:
            "A verificação de segurança expirou. Ela está sendo refeita logo abaixo — assim que " +
            "concluir, clique em enviar de novo. Se preferir, fale conosco pelo WhatsApp.",
        });
      } else {
        const detail = typeof result?.error === "string" ? result.error : "";
        setFeedback({
          type: "error",
          message:
            (detail ? detail + " " : "") +
            "Não conseguimos enviar seu pedido. Tente novamente ou fale conosco pelo WhatsApp.",
        });
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setFeedback({
        type: "error",
        message: aborted
          ? "O envio demorou demais para responder. Verifique sua conexão e tente novamente, ou fale conosco pelo WhatsApp."
          : "Não conseguimos enviar seu pedido agora. Verifique sua conexão e tente novamente, ou fale conosco pelo WhatsApp.",
      });
    } finally {
      clearTimeout(timeout);
      setSending(false);
      // SEMPRE pede um token novo, inclusive quando deu certo: o token é de
      // uso único (a Cloudflare recusa o replay com `timeout-or-duplicate`).
      // Sem isto, quem errasse o telefone no primeiro envio tomaria um erro
      // de "verificação" no segundo, sem entender por quê.
      setTurnstileToken(null);
      setTurnstileReset((n) => n + 1);
    }
  }

  return (
    <form id="booking-form" ref={formRef} onSubmit={handleSubmit}>
      <input
        type="text"
        name="nome"
        placeholder="Nome completo"
        required
        onChange={handleNomeInput}
        // Atributo HTML `pattern`: string JS comum, não regex literal — todo
        // backslash precisa vir duplicado (\\s) pra sobreviver ao parser do
        // JS e chegar no atributo como "\s" de verdade. Evitamos \p{L} aqui
        // de propósito (suporte inconsistente no atributo `pattern` entre
        // navegadores) — faixa explícita de acentuação latina em vez disso.
        // O filtro de verdade é o onChange acima + a validação do servidor
        // (NOME_PATTERN em app/lib/leads.ts, que aí sim usa \p{L} livremente
        // porque é regex literal do JS, não atributo HTML).
        pattern="^[A-Za-zÀ-ÖØ-öø-ÿ\\s'-]+$"
        title="Apenas letras, espaço, hífen e apóstrofo — sem número ou símbolo."
      />
      <div className="form-row">
        <input
          type="tel"
          name="telefone"
          placeholder="Telefone / WhatsApp"
          required
          onChange={handleTelefoneInput}
          pattern="^[0-9()\\-\\s+]+$" // idem nota acima: backslash duplicado por ser string JS, não regex literal
          title="Apenas números e formatação de telefone (espaço, parênteses, hífen) — sem letra ou símbolo."
        />
        <select name="melhor_horario" defaultValue="">
          <option value="">Melhor horário (opcional)</option>
          {MELHOR_HORARIO_OPTIONS.map((opt) => (
            <option key={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <select name="tratamento" required defaultValue="">
        <option value="" disabled>
          Tratamento de interesse
        </option>
        {TREATMENT_OPTIONS.map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>

      {/* Consentimento LGPD (art. 11 dado sensível de saúde + art. 33 transferência
          internacional) — texto definido por compliance, NÃO parafraseie e não
          "enxugue" aqui: cada parte dele carrega um requisito legal.

          Atualizado na v2.0 da política (2026-08-14). A redação anterior citava
          "armazenados nos Estados Unidos pelo provedor do formulário
          (Formspree, Inc.)", o que virou factualmente FALSO quando a Formspree
          saiu do fluxo — a Formspree não recebe mais nada. Quem recebe hoje
          está nomeado abaixo e detalhado na seção 4 de PRIVACIDADE.md.

          Por que o texto fala em transferência internacional sem afirmar um
          país: a região do projeto Supabase ainda não foi escolhida pelo dono
          do site (ver o bloqueador na seção 4.1 da política). Mesmo no melhor
          cenário (banco em São Paulo), Resend (EUA), Cloudflare Turnstile
          (rede global) e o backup em R2 (sem região na América do Sul)
          mantêm a transferência internacional existindo — por isso ela é
          declarada aqui em qualquer hipótese.

          SE ESTE TEXTO MUDAR DE SUBSTÂNCIA: bumpe CURRENT_POLICY_VERSION em
          app/lib/leads.ts e o `value` do input escondido logo abaixo. */}
      {/* <fieldset> em vez de dois <label> soltos: agrupa visualmente (barra +
          respiro, ver .consent-group em globals.css) E semanticamente — um
          landmark explícito de "isto é a seção de consentimento legal" para
          quem navega o formulário com leitor de tela. Um <fieldset> não
          participa da árvore de FormData além dos <input> que já estavam
          aqui dentro: nenhum campo muda de nome/valor, o POST /api/leads
          continua recebendo exatamente o mesmo payload. */}
      <fieldset className="consent-group">
        <legend>Consentimento</legend>
        <label className="consent">
          <input type="checkbox" name="consentimento_lgpd" value="sim" required />
          <span>
            <span className="consent-tag required">Obrigatório</span>Autorizo a Clínac a tratar meu
            nome, telefone e o tratamento de interesse informado — que é <strong>dado de saúde</strong>{" "}
            — para retornar meu contato e agendar minha avaliação. Autorizo também que esses dados
            sejam processados pelos serviços de tecnologia usados por este site (Supabase e
            Cloudflare), <strong>parte deles com infraestrutura fora do Brasil</strong> — transferência
            internacional detalhada na seção 4 da{" "}
            <Link href="/privacidade" target="_blank" rel="noopener">
              Política de Privacidade
            </Link>
            , que li e aceito, junto com os{" "}
            <Link href="/termos" target="_blank" rel="noopener">
              Termos de Uso
            </Link>
            .
          </span>
        </label>

        <label className="consent consent-opt">
          <input type="checkbox" name="consentimento_marketing" value="sim" />
          <span>
            <span className="consent-tag optional">Opcional</span>Quero receber novidades, campanhas e
            promoções da Clínac. Posso cancelar quando quiser, sem prejuízo ao meu atendimento.
          </span>
        </label>
      </fieldset>

      {/* Espelho visível da constante do servidor (CURRENT_POLICY_VERSION em
          app/lib/leads.ts). O servidor IGNORA o que chega aqui e grava a
          constante dele — este campo existe só para quem abrir o dev tools
          conseguir ver qual versão está sendo aceita. Mantenha os dois iguais. */}
      <input type="hidden" name="politica_versao" value="PRIVACIDADE v2.1 - 2026-08-20" />

      {/* Honeypot anti-spam: campo escondido do usuário. O frontend não filtra
          nada com base nele — quem precisa descartar envios com _gotcha
          preenchido no servidor é `backend` (ver contrato no topo do arquivo). */}
      <input
        type="text"
        name="_gotcha"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ display: "none" }}
      />

      {/* Verificação anti-robô (Cloudflare Turnstile). Fica ANTES do botão de
          propósito: o visitante precisa ver o que está acontecendo antes de
          clicar em enviar, não depois de tomar um erro. No modo "Managed" a
          maioria das pessoas só vê um "verificado" aparecer sozinho em ~1 s;
          quem for suspeito recebe um desafio.

          Sem sitekey (produção não configurada) não renderizamos nada aqui —
          o aviso vem do handleSubmit, com a mensagem que aponta o WhatsApp.
          Estilo em app/globals.css (.turnstile-widget) é o mínimo de
          espaçamento; refinamento visual é território de `design`. */}
      {SITE_KEY ? (
        <TurnstileWidget
          siteKey={SITE_KEY}
          onToken={handleTurnstileToken}
          resetSignal={turnstileReset}
        />
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={sending}>
        {sending ? "Enviando…" : "Solicitar avaliação"}
      </button>
      <p
        className={`form-feedback${feedback ? ` is-${feedback.type}` : ""}`}
        role="status"
        aria-live="polite"
        hidden={!feedback}
      >
        {feedback?.message}
      </p>
      {feedback?.type === "success" ? (
        <a
          href={feedback.whatsappUrl}
          target="_blank"
          rel="noopener"
          className="btn btn-primary"
          style={{ marginTop: "12px" }}
          onClick={() => trackEvent("whatsapp_click", { source: "post_submit_confirmation" })}
        >
          Confirmar pelo WhatsApp
        </a>
      ) : null}
      <p className="form-note">
        Formulário para maiores de 18 anos. Se a avaliação for para criança ou adolescente, o
        preenchimento deve ser feito pelo responsável legal. Não envie CPF, número de convênio ou
        informações clínicas por aqui.
      </p>
    </form>
  );
}
