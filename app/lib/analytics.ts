"use client";

/* ==========================================================
   Analytics / Instrumentação (métricas de sucesso definidas por product)
   ==========================================================

   PONTO ÚNICO DE INTEGRAÇÃO: trackEvent(name, props). Trocar de ferramenta
   de analytics é editar SÓ o corpo desta função — nenhum outro componente
   deste app muda. Por padrão, sem nenhuma conta de analytics configurada,
   os eventos só vão para o console (console.debug): nada sai do navegador.
   Migrado 1:1 do bloco "5) Analytics / Instrumentação" de index.html.

   >>> PARA LIGAR UMA FERRAMENTA DE VERDADE (ex. Plausible) <<<
     1. Adicione o snippet do provedor em app/layout.tsx (<head>), ex.:
          <script defer data-domain="SEU-DOMINIO" src="https://plausible.io/js/script.js" />
     2. Troque o corpo de trackEvent() abaixo pela chamada real do SDK,
        ex.: if (typeof window !== 'undefined' && window.plausible) window.plausible(name, { props });
     Nenhum outro ponto deste app precisa mudar.

   FERRAMENTA RECOMENDADA (decisão do dono do site, não fizemos essa conta):
     Plausible (ou equivalente "privacy-first": Fathom, Simple Analytics...).
     compliance já confirmou que este site NÃO precisa de banner de cookies
     hoje; Plausible/Fathom não usam cookie nem fingerprint, então não
     re-introduzem essa obrigação. GA4 usaria cookies/IDs client-side e
     reativaria a exigência de banner de consentimento que hoje NÃO existe.
     Ferramenta final é decisão do dono do site.

   EVENTOS DISPARADOS E O QUE CADA UM CARREGA (nunca nome/telefone/e-mail):
     - whatsapp_click
         dispara no clique em qualquer ponto de contato do WhatsApp.
         prop: { source: 'floating' | 'inline' | 'post_submit_confirmation' }
         ('post_submit_confirmation' = botão "Confirmar pelo WhatsApp" que
         aparece só depois de um envio de formulário confirmado — ver
         BookingForm.tsx e app/lib/site-config.ts, buildWhatsAppUrl)
     - form_submit_success
         dispara só quando o backend confirma o envio (ver
         app/components/BookingForm.tsx). Não carrega propriedade nenhuma:
         é usado como contagem de conversão confirmada, não como registro
         de quem converteu.
         props: {}
     - treatment_interest_selected
         dispara junto com form_submit_success, no mesmo instante. Lê o
         valor do <select name="tratamento"> diretamente do formulário
         (nunca reenviado por outro lugar, nunca associado a
         nome/telefone) — é só o rótulo da opção escolhida (ex.
         "Ortodontia"), tratado como categoria agregada, não texto livre
         do usuário.
         prop: { treatment: <rótulo da opção selecionada> }

   Sem cookie, sem localStorage, sem ID entre sessões, sem fingerprint:
   cada evento carrega só o que está descrito acima, por page view.
   ========================================================== */

export type AnalyticsProps = Record<string, string>;

export function trackEvent(name: string, props?: AnalyticsProps): void {
  // PLACEHOLDER — nenhuma conta de analytics real configurada ainda.
  // Ver instruções acima para trocar por Plausible/Fathom/etc.
  if (typeof window !== "undefined") {
    console.debug("[Clínac][analytics]", name, props ?? {});
  }
}
