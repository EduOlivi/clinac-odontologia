import "server-only";

import {
  includeHealthDataInEmail,
  leadNotificationFrom,
  leadNotificationTo,
  resendApiKey,
  siteUrl,
} from "./env";
import type { LeadInput } from "./leads";

/* ==========================================================================
   Aviso de novo lead por e-mail (Resend)
   ==========================================================================
   POR QUE RESEND (e não outro)
   ---------------------------
   Precisávamos de: plano gratuito que cubra dezenas/centenas de e-mails por
   mês, API HTTP simples (nada de SMTP — Cloudflare Workers não abre socket
   TCP, então uma lib tipo Nodemailer simplesmente não roda lá), e nenhuma
   exigência de cartão de crédito para começar. Resend atende os três: ~3.000
   e-mails/mês no free, um POST em /emails, e o SDK nem é necessário — este
   arquivo usa `fetch` puro, então não entra dependência nova no projeto e
   não há risco de a lib puxar algo específico de Node.

   Alternativas descartadas: SendGrid/Mailgun (free tier hoje mais restrito e
   com exigência de cartão/verificação pesada para o porte disto), SMTP do
   Gmail (não funciona em Worker), WhatsApp Cloud API (o melhor canal para uma
   clínica na prática, mas exige conta Meta Business verificada e aprovação de
   template — friction alta demais para um MVP; fica registrado como evolução
   natural, o ponto de troca é só esta função).

   E-MAIL É NOTIFICAÇÃO, NÃO É O BANCO
   -----------------------------------
   Se o e-mail falhar, o lead JÁ ESTÁ salvo — a rota registra o erro e devolve
   sucesso mesmo assim. O contrário (perder o lead porque o provedor de e-mail
   estava fora do ar) seria trocar a fonte da verdade por um efeito colateral.

   DADO DE SAÚDE NO E-MAIL: DECISÃO PENDENTE DE COMPLIANCE
   -------------------------------------------------------
   O tratamento de interesse é dado sensível (LGPD art. 11). Mandá-lo por
   e-mail significa copiá-lo para: os servidores do Resend (EUA) e a caixa
   postal da clínica (provavelmente Gmail, também EUA) — o que reintroduz,
   pela porta dos fundos, exatamente a transferência internacional que a saída
   da Formspree pretendia resolver.

   Por isso o padrão (`LEAD_EMAIL_INCLUDE_HEALTH_DATA=false`) é o e-mail
   avisar que chegou um lead, com nome/telefone/horário para o retorno, e
   deixar o tratamento visível só no painel. Quem retorna a ligação sabe
   quem ligar; o dado de saúde não sai do banco.

   Se compliance concluir que o consentimento cobre esse envio (ou se o dono
   do site usar um e-mail hospedado no Brasil), basta ligar a variável — o
   e-mail passa a incluir o tratamento. É uma decisão jurídica, não técnica:
   não a tomamos aqui.
   ========================================================================== */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 8000;

export type NotifyResult =
  | { sent: true }
  | { sent: false; reason: "nao-configurado" | "erro-do-provedor" | "timeout" | "excecao"; detail?: string };

/** Escapa texto do usuário antes de entrar no HTML do e-mail. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmail(lead: LeadInput, leadId: string) {
  const withHealthData = includeHealthDataInEmail();
  const painelUrl = `${siteUrl().replace(/\/+$/, "")}/admin/leads`;

  const linhas: Array<[string, string]> = [
    ["Nome", lead.nome],
    ["Telefone", lead.telefone],
    ["Melhor horário", lead.melhor_horario ?? "não informado"],
    [
      "Tratamento de interesse",
      withHealthData ? lead.tratamento : "(não exibido por e-mail — ver no painel)",
    ],
    ["Aceita receber novidades", lead.consentimento_marketing ? "sim" : "não"],
  ];

  const texto = [
    "Novo pedido de avaliação pelo site.",
    "",
    ...linhas.map(([rotulo, valor]) => `${rotulo}: ${valor}`),
    "",
    `Ver no painel: ${painelUrl}`,
    `ID do lead: ${leadId}`,
  ].join("\n");

  const html = [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;color:#10241B">',
    "<p><strong>Novo pedido de avaliação pelo site.</strong></p>",
    '<table cellpadding="6" style="border-collapse:collapse">',
    ...linhas.map(
      ([rotulo, valor]) =>
        `<tr><td style="color:#5a6b62">${escapeHtml(rotulo)}</td><td><strong>${escapeHtml(valor)}</strong></td></tr>`,
    ),
    "</table>",
    `<p><a href="${escapeHtml(painelUrl)}">Abrir o painel de leads</a></p>`,
    `<p style="color:#8a9a92;font-size:12px">ID do lead: ${escapeHtml(leadId)}</p>`,
    "</div>",
  ].join("");

  return {
    // O assunto NUNCA leva dado de saúde: ele aparece em notificação de
    // celular, na pré-visualização da caixa de entrada e em log de servidor
    // de e-mail — lugares que ninguém controla.
    subject: `Novo pedido de avaliação — ${lead.nome}`,
    text: texto,
    html,
  };
}

/**
 * Envia o aviso. NUNCA lança: devolve um resultado que a rota registra em log.
 */
export async function notifyNewLead(lead: LeadInput, leadId: string): Promise<NotifyResult> {
  const apiKey = resendApiKey();
  const from = leadNotificationFrom();
  const to = leadNotificationTo();

  if (!apiKey || !from || to.length === 0) {
    // Estado esperado enquanto o dono do site não criar a conta no Resend:
    // o formulário continua funcionando e os leads continuam sendo salvos —
    // só não chega e-mail. Ver .env.example.
    return { sent: false, reason: "nao-configurado" };
  }

  const { subject, text, html } = buildEmail(lead, leadId);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text, html, reply_to: from }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Lemos o corpo com limite: a mensagem de erro vai para o log e não
      // queremos despejar uma resposta gigante lá.
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      return { sent: false, reason: "erro-do-provedor", detail: `HTTP ${response.status} ${detail}` };
    }

    return { sent: true };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { sent: false, reason: "timeout" };
    }
    return {
      sent: false,
      reason: "excecao",
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}
