import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/* ==========================================================================
   Config do Vitest — testes unitários/integração leve, sem browser
   ==========================================================================
   Escopo deliberadamente pequeno (ver docs em cada arquivo de teste, e o
   relatório de qa): isto cobre a lógica de validação/autorização que roda no
   servidor (o caminho crítico do site: aceitar ou recusar um agendamento),
   não a renderização de componentes React. Não há jsdom/Testing Library
   aqui — se um dia justificar testar interação de UI (não só lógica), esse é
   o próximo investimento, não este.

   environment: "node" (não "jsdom") — os arquivos testados hoje são rotas de
   API e módulos de lib puros, que rodam no servidor.
   ========================================================================== */
export default defineConfig({
  resolve: {
    alias: {
      /* ------------------------------------------------------------------
         `server-only` é um pacote-marcador: fora do bundler do Next, o seu
         `index.js` simplesmente LANÇA ("This module cannot be imported from
         a Client Component module"). Quem decide qual arquivo carregar é a
         condição de exportação `react-server`, que o Next define e o Vitest
         não.

         Sem este alias, qualquer módulo do servidor que importe
         "server-only" e NÃO esteja mockado quebra a suíte inteira na
         importação — foi exatamente o que aconteceu quando
         app/lib/turnstile.ts entrou em app/api/leads/route.ts (os outros
         módulos com "server-only" no topo, `notify` e `supabase/admin`,
         estavam mockados e por isso o problema não tinha aparecido antes).

         Apontamos para o `empty.js` que o próprio pacote já traz para esse
         fim (é o arquivo que a condição `react-server` escolhe em produção),
         por caminho absoluto porque ele não é um subpath exportado. Isto NÃO
         afrouxa a trava: quem impede a `service_role`/`TURNSTILE_SECRET_KEY`
         de vazar para o bundle do navegador é o build do Next, que continua
         usando o pacote de verdade.
         ------------------------------------------------------------------ */
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["app/**/*.test.ts"],
  },
});
