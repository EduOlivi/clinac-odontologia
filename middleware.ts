import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/* ==========================================================================
   middleware.ts — renovação da sessão do painel /admin
   ==========================================================================
   >>> POR QUE ESTE ARQUIVO SE CHAMA `middleware.ts` E NÃO `proxy.ts` <<<
   No Next 16 o antigo `middleware.ts` foi renomeado para `proxy.ts` — e a
   partir do Next 16, um arquivo `proxy.ts` roda OBRIGATORIAMENTE no runtime
   Node.js (a opção `runtime: "edge"` passou a ser rejeitada pelo compilador
   do Next dentro de `proxy.ts`, ver changelog do Next).

   O adapter que este projeto usa para publicar no Cloudflare Workers
   (@opennextjs/cloudflare) NÃO suporta middleware/proxy rodando em Node.js
   — só Edge. Um mantenedor do adapter confirmou publicamente que isso não
   vai ser suportado neste pacote (vai ficar para uma "adapters API"
   separada, ainda sem previsão):
   https://github.com/opennextjs/opennextjs-cloudflare/issues/1213#issuecomment (vicb)

   `npx opennextjs-cloudflare build` falha com
   "Node.js middleware is not currently supported" se este arquivo se
   chamar `proxy.ts`. A convenção antiga `middleware.ts` continua
   funcionando no Next 16.3 (deprecada, não removida) e ainda aceita
   `runtime: "experimental-edge"` no `config` abaixo — é o workaround
   documentado no próprio issue acima, e o único jeito de ter esta função
   (renovar sessão a cada request) funcionando neste stack hoje.

   NÃO renomeie este arquivo para `proxy.ts` (nem rode o codemod
   `@next/codemod middleware-to-proxy`) sem antes conferir se
   @opennextjs/cloudflare passou a suportar Node.js middleware — ver
   docs/DEPLOY.md, seção "Por que middleware.ts e não proxy.ts".

   >>> POR QUE ESTE ARQUIVO EXISTE <<<
   O token de acesso do Supabase expira em ~1h. Quem troca o refresh token
   por um novo par de tokens é o SDK — mas ele precisa GRAVAR os tokens
   novos em cookie, e um Server Component não pode gravar cookie durante a
   renderização. Sem este arquivo, a equipe seria deslogada do painel a
   cada hora, no meio do trabalho.

   O `matcher` restringe a execução a `/admin/*`: o site institucional (que
   é o que 99,9% do tráfego acessa) não paga nem 1 ms nem uma invocação
   extra de Worker por causa disso.

   Isto NÃO é o controle de acesso. Quem barra o acesso aos dados é a RLS no
   Postgres, e quem redireciona para o login é a própria página. Um
   middleware que "protege" rotas é uma verificação a mais, nunca a única —
   ver app/lib/supabase/server.ts.

   Nota: aqui lemos `process.env` direto, sem passar por app/lib/env.ts, de
   propósito — aquele módulo importa "server-only", que não deve ser puxado
   para o bundle do middleware. São duas variáveis; duplicar é mais barato
   que o risco.
   ========================================================================== */

export async function middleware(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  // Ambiente sem configuração (ex.: `next build` sem .env): não é papel do
  // middleware explodir aqui. A página do painel mostra o erro de
  // configuração com uma mensagem que a pessoa entende.
  if (!url || !anonKey) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    // Precisa bater com app/lib/supabase/server.ts — ver comentário lá.
    cookieOptions: { httpOnly: true, secure: true, sameSite: "lax" },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // A chamada em si é o efeito colateral desejado: se o token estiver
  // vencido, o SDK renova e o setAll acima persiste os cookies novos.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
  // Ver bloco de comentário acima — obrigatório para o build do Cloudflare
  // Workers/OpenNext aceitar este arquivo.
  runtime: "experimental-edge",
};
