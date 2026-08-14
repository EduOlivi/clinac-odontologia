import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "../env";

/* ==========================================================================
   Cliente Supabase com a chave `service_role`
   ==========================================================================
   Esta chave IGNORA Row Level Security. É acesso root ao banco.

   Onde pode ser usada:
     * app/api/leads/route.ts    — o INSERT do lead (não existe policy de
                                   INSERT para ninguém; é este o único
                                   caminho de escrita, de propósito)
     * app/api/keepalive/route.ts — o ping que evita a pausa por inatividade

   Onde NÃO pode ser usada, nunca:
     * qualquer arquivo com "use client"
     * páginas do /admin — lá a leitura passa pela sessão do usuário e pelas
       policies (ver ./server.ts). Usar service_role no painel seria trocar
       uma regra de autorização verificada pelo banco por um `if` em
       TypeScript que ninguém revisa.

   O `import "server-only"` acima transforma um uso errado em erro de build.
   ========================================================================== */

/**
 * Cria um cliente novo a cada chamada em vez de guardar um singleton de
 * módulo. Em Workers o isolate é compartilhado entre requisições de usuários
 * diferentes; um cliente com estado por requisição em escopo de módulo é a
 * receita clássica de vazar contexto de um usuário para outro. O construtor
 * é barato (é só um wrapper de `fetch`).
 */
export function createServiceRoleClient(): SupabaseClient {
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: {
      // Nada de sessão: esta chave não representa um usuário e não deve
      // tentar persistir/renovar token nenhum (e não há storage no Worker).
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-application-name": "clinac-site" },
    },
  });
}
