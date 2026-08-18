"use client";

import { useEffect, useRef } from "react";

/* ==========================================================================
   Widget do Cloudflare Turnstile — versão React
   ==========================================================================
   A integração "oficial" da Cloudflare é uma tag <script> + uma <div
   class="cf-turnstile" data-sitekey="..."> no HTML. Isso não funciona bem num
   componente React: o script procura as divs UMA vez, quando carrega, e o
   React monta/desmonta/remonta o formulário quando quiser (em dev, o
   StrictMode faz isso de propósito). O resultado seria widget duplicado ou
   nenhum widget.

   Por isso aqui usamos a renderização EXPLÍCITA documentada
   (https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/):
   o script é carregado uma vez por página com `?render=explicit` (sem
   varredura automática de HTML) e nós chamamos `turnstile.render()` na
   montagem e `turnstile.remove()` na desmontagem. O ciclo de vida do widget
   passa a ser o mesmo do componente.

   >>> PENDÊNCIA ABERTA PARA `compliance` (não é decisão de quem escreveu
       este arquivo) <<<
   Este componente carrega JavaScript da Cloudflare no navegador do visitante.
   Ele NÃO é analytics e não rastreia audiência — a finalidade é única e
   declarada (decidir se há um bot enviando o formulário) —, mas ele coleta
   sinais do ambiente do browser e, em algumas configurações, grava cookie
   próprio. A seção 2.5 da política de privacidade (PRIVACIDADE.md e
   app/privacidade/page.tsx) afirma hoje que "este site não utiliza cookies
   próprios... nem qualquer outra ferramenta de rastreamento": continua
   verdadeiro quanto a rastreamento de audiência, mas ficou impreciso por
   omissão. O texto jurídico NÃO foi alterado aqui de propósito — está
   registrado como pendência no README, seção "Páginas legais".

   >>> O TOKEN É DE USO ÚNICO <<<
   A Cloudflare valida cada token uma vez só (a segunda tentativa volta com
   `timeout-or-duplicate`) e ele expira em 5 minutos. Ou seja: depois de CADA
   envio — inclusive um que falhou por telefone inválido — é preciso um token
   novo. É para isso que existe a prop `resetSignal`: o formulário incrementa
   um contador depois de cada tentativa e este componente refaz o desafio.
   Sem isso, o segundo envio de quem errou um campo no primeiro seria
   recusado com uma mensagem que não faz sentido para o visitante.
   ========================================================================== */

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Sitekey de TESTE da Cloudflare, "always passes", widget visível —
 * documentada em https://developers.cloudflare.com/turnstile/troubleshooting/testing/.
 * Usada só fora de produção (ver BookingForm.tsx) para que `npm run dev`
 * funcione sem exigir uma conta Turnstile de verdade. Ela gera o token
 * fictício `XXXX.DUMMY.TOKEN.XXXX`, que uma chave secreta de produção
 * REJEITA — não existe caminho em que esta constante enfraqueça o site
 * publicado.
 */
export const TEST_SITE_KEY_ALWAYS_PASSES = "1x00000000000000000000AA";

type TurnstileRenderOptions = {
  sitekey: string;
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  "timeout-callback"?: () => void;
  theme?: "auto" | "light" | "dark";
  language?: string;
  action?: string;
};

type TurnstileApi = {
  render: (container: HTMLElement | string, options: TurnstileRenderOptions) => string | undefined;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Uma promise por página, não por componente: se um dia existirem dois
 * formulários, o <script> continua sendo baixado e avaliado uma única vez.
 */
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("turnstile-script")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => {
      // Zera para permitir uma nova tentativa numa navegação seguinte —
      // bloqueador de anúncio e rede instável são as causas comuns aqui.
      scriptPromise = null;
      reject(new Error("turnstile-script"));
    }, { once: true });
    document.head.appendChild(script);
  });

  return scriptPromise;
}

type Props = {
  /** Sitekey pública (NEXT_PUBLIC_TURNSTILE_SITE_KEY, ou a de teste em dev). */
  siteKey: string;
  /**
   * Chamado com o token quando o desafio é resolvido, e com `null` quando ele
   * expira, falha ou é resetado. O formulário guarda esse valor e o manda no
   * corpo do POST.
   */
  onToken: (token: string | null) => void;
  /** Mudou de valor => refazer o desafio (token é de uso único, ver acima). */
  resetSignal: number;
};

export default function TurnstileWidget({ siteKey, onToken, resetSignal }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // `onToken` guardado em ref para que o efeito de montagem NÃO dependa dele:
  // se um dia o formulário passar a recriar a função a cada render, depender
  // dela remontaria o widget (e perderia o token) a cada tecla digitada em
  // qualquer campo do formulário.
  //
  // A sincronia é feita dentro de um efeito, e não no corpo do componente,
  // porque escrever em ref durante a renderização é justamente o que a regra
  // react-hooks/refs proíbe (e por bom motivo: a render pode ser descartada
  // pelo React). O valor inicial já vem certo do próprio useRef, então o
  // primeiro `render()` do widget nunca vê um callback desatualizado.
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let cancelado = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelado || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current =
          window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            // Fixo em "dark" (não "auto"): o widget sempre fica dentro do
            // cartão pinho escuro (.booking-box). "auto" segue o tema
            // claro/escuro do SISTEMA OPERACIONAL do visitante — quem estiver
            // no modo claro do SO recebia a pele clara do Cloudflare,
            // encravada dentro do cartão escuro (design, auditoria visual).
            theme: "dark",
            language: "pt-br",
            callback: (token: string) => onTokenRef.current(token),
            // Token vencido (5 min) — o widget se renova sozinho, mas até lá
            // o que temos em mãos não vale mais.
            "expired-callback": () => onTokenRef.current(null),
            "timeout-callback": () => onTokenRef.current(null),
            "error-callback": () => onTokenRef.current(null),
          }) ?? null;
      })
      .catch(() => {
        if (!cancelado) onTokenRef.current(null);
      });

    return () => {
      cancelado = true;
      const id = widgetIdRef.current;
      widgetIdRef.current = null;
      if (id && window.turnstile) {
        // `remove` e não `reset`: sem isto, o StrictMode do React em dev
        // deixaria um widget órfão a cada remontagem.
        try {
          window.turnstile.remove(id);
        } catch {
          /* widget já removido junto com o container — nada a fazer */
        }
      }
    };
  }, [siteKey]);

  useEffect(() => {
    // Ignora a montagem inicial: não há nada para resetar ainda.
    if (resetSignal === 0) return;
    const id = widgetIdRef.current;
    if (id && window.turnstile) {
      onTokenRef.current(null);
      window.turnstile.reset(id);
    }
  }, [resetSignal]);

  return <div className="turnstile-widget" ref={containerRef} aria-live="polite" />;
}
