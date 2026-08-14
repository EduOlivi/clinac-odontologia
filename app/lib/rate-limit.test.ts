import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, clientIp } from "./rate-limit";

/* ==========================================================================
   Testes de app/lib/rate-limit.ts
   ==========================================================================
   Escopo: só a lógica pura (janela fixa em memória + resolução de IP). NÃO
   testamos aqui a limitação conhecida documentada no topo do arquivo (não
   compartilhado entre isolates do Worker) — isso não é testável fora de um
   Worker real e já está com um plano de mitigação (Turnstile/KV) registrado
   no código para `devops`, não é uma lacuna de teste.

   Cada teste usa uma `key` própria (gerada com um contador) para não
   compartilhar estado com os outros testes através do store singleton do
   módulo — a alternativa seria exportar a classe MemoryRateLimitStore só
   para teste, o que abriria API interna sem necessidade.
   ========================================================================== */

let keyCounter = 0;
function freshKey(): string {
  keyCounter += 1;
  return `test-key-${keyCounter}`;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("permite requisições dentro do limite", async () => {
    const key = freshKey();
    const options = { limit: 3, windowMs: 60_000 };

    for (let i = 0; i < 3; i++) {
      const decision = await checkRateLimit(key, options);
      expect(decision.allowed).toBe(true);
    }
  });

  it("bloqueia a requisição que excede o limite, com retryAfterSeconds > 0", async () => {
    const key = freshKey();
    const options = { limit: 2, windowMs: 60_000 };

    await checkRateLimit(key, options);
    await checkRateLimit(key, options);
    const third = await checkRateLimit(key, options);

    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("libera de novo depois que a janela expira", async () => {
    vi.useFakeTimers();
    try {
      const key = freshKey();
      const options = { limit: 1, windowMs: 1000 };

      const first = await checkRateLimit(key, options);
      expect(first.allowed).toBe(true);

      const secondWithinWindow = await checkRateLimit(key, options);
      expect(secondWithinWindow.allowed).toBe(false);

      vi.advanceTimersByTime(1001);

      const afterWindow = await checkRateLimit(key, options);
      expect(afterWindow.allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("contadores de chaves diferentes não se misturam", async () => {
    const keyA = freshKey();
    const keyB = freshKey();
    const options = { limit: 1, windowMs: 60_000 };

    await checkRateLimit(keyA, options);
    const secondForA = await checkRateLimit(keyA, options);
    const firstForB = await checkRateLimit(keyB, options);

    expect(secondForA.allowed).toBe(false);
    expect(firstForB.allowed).toBe(true);
  });
});

describe("clientIp", () => {
  function requestWith(headers: Record<string, string>): Request {
    return new Request("https://example.com/api/leads", { headers });
  }

  it("prioriza cf-connecting-ip sobre os outros headers", () => {
    const req = requestWith({
      "cf-connecting-ip": "1.1.1.1",
      "x-forwarded-for": "2.2.2.2",
      "x-real-ip": "3.3.3.3",
    });
    expect(clientIp(req)).toBe("1.1.1.1");
  });

  it("usa x-forwarded-for (primeiro IP da lista) quando cf-connecting-ip está ausente", () => {
    const req = requestWith({ "x-forwarded-for": "2.2.2.2, 9.9.9.9" });
    expect(clientIp(req)).toBe("2.2.2.2");
  });

  it("usa x-real-ip como último fallback antes de sem-ip", () => {
    const req = requestWith({ "x-real-ip": "3.3.3.3" });
    expect(clientIp(req)).toBe("3.3.3.3");
  });

  it('devolve "sem-ip" quando nenhum header de IP está presente', () => {
    const req = requestWith({});
    expect(clientIp(req)).toBe("sem-ip");
  });
});
