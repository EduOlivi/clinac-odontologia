import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "../env";

/* ==========================================================================
   Cliente Supabase da SESSÃO DO USUÁRIO (painel /admin)
   ==========================================================================
   Usa a chave `anon`, que respeita RLS, mais o JWT da sessão guardado em
   cookie. Ou seja: quem decide se a equipe pode ler os leads é a policy no
   Postgres (`is_clinic_staff()`), não um `if` no TypeScript.

   Isso é uma escolha, não um detalhe: seria mais curto ler os leads com a
   service_role dentro da página e checar a permissão em JS. Aí um `return`
   esquecido, um layout que renderiza antes do redirect ou uma rota nova
   copiada e colada viram vazamento de dado de saúde. Com RLS, o pior caso de
   um bug desses é uma lista vazia.

   A chave `anon` também é lida do servidor (não é `NEXT_PUBLIC_*`) porque o
   navegador nunca fala direto com o Supabase neste projeto — login, listagem
   e mudança de status passam todos por Server Action.
   ========================================================================== */

/**
 * @param allowCookieWrites
 *   `true` em Server Action e Route Handler (podem gravar cookie, e é assim
 *   que o login guarda a sessão e o refresh token rotacionado é persistido).
 *   `false` em Server Component: o Next proíbe gravar cookie durante a
 *   renderização, então engolimos a escrita — quem renova a sessão nesse
 *   caminho é o `proxy.ts`.
 */
export async function createUserClient(allowCookieWrites = false): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    // SEGURANÇA: @supabase/ssr grava o cookie de sessão (access+refresh
    // token, válido por até 400 dias) com httpOnly:false por padrão — pensado
    // pra apps que também têm um client-side Supabase lendo o cookie no
    // navegador. Este projeto não tem nenhum (login/leitura/status passam só
    // por Server Action/Component) — então httpOnly:true não quebra nada e
    // fecha o roubo de sessão via um XSS futuro no painel que expõe dado de
    // saúde de paciente. Precisa bater com middleware.ts (mesmas opções),
    // senão a renovação de token entra em conflito com o cookie já gravado.
    cookieOptions: { httpOnly: true, secure: true, sameSite: "lax" },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        if (!allowCookieWrites) return;
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component tentando gravar cookie. Ignorar é o
          // comportamento recomendado pelo @supabase/ssr — a sessão continua
          // válida para esta requisição e o proxy.ts renova na próxima.
        }
      },
    },
  });
}

export type StaffSession = {
  userId: string;
  email: string | null;
  /** Está na allowlist `admin_users`? Logado != autorizado. */
  isStaff: boolean;
};

/**
 * Devolve a sessão atual, ou `null` se não houver usuário logado.
 *
 * Usa `getUser()` (que valida o JWT contra o servidor do Supabase) e nunca
 * `getSession()` (que só lê o cookie e confia nele) — a diferença importa
 * quando a decisão de mostrar dado sensível depende do resultado.
 */
export async function getStaffSession(): Promise<StaffSession | null> {
  const supabase = await createUserClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // A allowlist é conferida no banco, pela mesma função que as policies usam
  // — não duplicamos a regra aqui para não haver duas versões dela.
  const { data: isStaff } = await supabase.rpc("is_clinic_staff");

  return {
    userId: user.id,
    email: user.email ?? null,
    isStaff: isStaff === true,
  };
}
