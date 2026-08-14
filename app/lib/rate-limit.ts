/* ==========================================================================
   Rate limit por IP — best-effort, com um aviso honesto embutido
   ==========================================================================
   LEIA ISTO ANTES DE CONFIAR NESTE ARQUIVO (devops, principalmente).

   O limitador abaixo guarda os contadores em memória do processo. Em `next
   dev` e em `next start` (Node de vida longa) isso funciona como o esperado.
   Em Cloudflare Workers — que é o destino deste site — NÃO funciona como um
   rate limit de verdade, e isso é uma limitação assumida, não um descuido:

     * cada isolate do Worker tem a sua própria memória;
     * a Cloudflare cria e destrói isolates a qualquer momento, e distribui a
       mesma requisição entre vários data centers.

   Ou seja: um atacante consegue mais envios que o limite configurado, e um
   isolate reciclado zera a contagem. O que este código entrega de verdade é
   (a) barrar o caso comum — o mesmo bot burro martelando o mesmo endpoint e
   caindo no mesmo isolate; (b) barrar duplo-clique/reenvio acidental de
   usuário real. Não entrega defesa contra um ataque distribuído.

   >>> DEPENDÊNCIA PARA `devops`, quando o deploy no Workers acontecer <<<
   Para um limite realmente compartilhado é preciso estado fora do isolate.
   Duas opções, em ordem de preferência para o volume deste site:

     1. Cloudflare Turnstile (grátis, mesma conta do deploy) no formulário —
        resolve o problema de origem (é bot?) melhor que contar requisições,
        e custa ~2 linhas no frontend + 1 verificação server-side aqui.
        É a recomendação; ver relatório do backend.
     2. Um KV namespace ou Durable Object. Nesse caso NÃO reescreva as rotas:
        implemente a interface `RateLimitStore` abaixo e chame
        `setRateLimitStore(...)` uma vez na inicialização. As rotas continuam
        chamando `checkRateLimit()` do mesmo jeito (por isso ela é async
        mesmo sendo síncrona hoje).

   Nada aqui protege contra conta paralisada por custo, porque não há esse
   risco nesta stack: o plano free do Supabase, do Resend e do Workers
   degrada/recusa quando estoura a cota, não gera fatura. O prejuízo de um
   flood é lixo no banco e cota de e-mail queimada — não uma cobrança.
   ========================================================================== */

export type RateLimitDecision = {
  allowed: boolean;
  /** Segundos até a janela liberar de novo (para o header Retry-After). */
  retryAfterSeconds: number;
};

export type RateLimitOptions = {
  /** Quantas requisições são permitidas dentro da janela. */
  limit: number;
  /** Tamanho da janela, em milissegundos. */
  windowMs: number;
};

export interface RateLimitStore {
  hit(key: string, options: RateLimitOptions): Promise<RateLimitDecision>;
}

/* ---------------------------------------------------------------------- */
/* Implementação padrão: janela fixa, em memória                          */
/* ---------------------------------------------------------------------- */

type Bucket = { count: number; resetAt: number };

class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, Bucket>();

  async hit(key: string, options: RateLimitOptions): Promise<RateLimitDecision> {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      this.sweep(now);
      return { allowed: true, retryAfterSeconds: 0 };
    }

    existing.count += 1;
    if (existing.count > options.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }

  /**
   * Limpeza preguiçosa: sem isto, o Map cresceria para sempre com IPs
   * antigos (vazamento de memória num processo Node de vida longa). Não
   * usamos setInterval de propósito — timer em escopo de módulo é
   * exatamente o tipo de coisa que não sobrevive ao Workers.
   */
  private sweep(now: number) {
    if (this.buckets.size < 500) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

let store: RateLimitStore = new MemoryRateLimitStore();

/** Ponto de injeção para uma implementação durável (KV/Durable Object). */
export function setRateLimitStore(next: RateLimitStore) {
  store = next;
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitDecision> {
  return store.hit(key, options);
}

/* ---------------------------------------------------------------------- */
/* Identificação do cliente                                               */
/* ---------------------------------------------------------------------- */

/**
 * Descobre o IP de origem.
 *
 * `CF-Connecting-IP` é preenchido pela própria Cloudflare e um cliente não
 * consegue forjá-lo através dela — por isso vem primeiro. `x-forwarded-for`
 * é aceito como fallback (dev local, outro proxy) sabendo que é forjável:
 * quem quiser furar o limite muda o header. Mais um motivo para tratar este
 * limitador como incômodo para bot burro, e não como controle de segurança.
 *
 * Sem nenhum header, todo mundo cai no mesmo balde "sem-ip". Preferimos
 * limitar demais a não limitar nada.
 */
export function clientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();

  return "sem-ip";
}
