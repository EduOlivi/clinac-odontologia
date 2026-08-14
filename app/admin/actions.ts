"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLeadStatus } from "../lib/leads";
import { checkRateLimit } from "../lib/rate-limit";
import { createUserClient, getStaffSession } from "../lib/supabase/server";

/* ==========================================================================
   Server Actions do painel
   ==========================================================================
   Tudo aqui roda no servidor. O navegador manda um POST do formulário e
   recebe HTML de volta — não existe SDK do Supabase no cliente, nem chave
   nenhuma no bundle.

   A autorização de verdade está na RLS do Postgres (policies de `leads`
   usando `is_clinic_staff()`). As checagens em TypeScript abaixo existem
   para dar mensagem decente ao usuário, não para segurar a porta: se
   alguém removesse os `if`, o banco continuaria recusando.
   ========================================================================== */

export type LoginState = { error?: string };

/** Limite por IP: 10 tentativas a cada 10 min (best-effort, ver rate-limit.ts). */
const LOGIN_RATE_LIMIT = { limit: 10, windowMs: 10 * 60 * 1000 };

async function requestIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "sem-ip"
  );
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }
  // Teto de tamanho: nada aqui deveria ser gigante, e senha longa demais só
  // serve para fazer o bcrypt do Supabase trabalhar à toa.
  if (email.length > 200 || password.length > 200) {
    return { error: "E-mail ou senha inválidos." };
  }

  const decision = await checkRateLimit(`login:${await requestIp()}`, LOGIN_RATE_LIMIT);
  if (!decision.allowed) {
    return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
  }

  // `true`: esta é uma Server Action, pode gravar o cookie de sessão.
  const supabase = await createUserClient(true);
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Mensagem propositalmente igual para "e-mail não existe" e "senha
    // errada": distinguir os dois entrega uma lista de e-mails válidos.
    console.warn(JSON.stringify({ evento: "admin_login_falhou", motivo: error.message }));
    return { error: "E-mail ou senha inválidos." };
  }

  redirect("/admin/leads");
}

export async function signOut() {
  const supabase = await createUserClient(true);
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export type UpdateStatusState = { error?: string; ok?: boolean };

export async function updateLeadStatus(
  _prev: UpdateStatusState,
  formData: FormData,
): Promise<UpdateStatusState> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !isLeadStatus(status)) {
    return { error: "Status inválido." };
  }

  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  if (!session.isStaff) {
    return { error: "Sua conta não tem permissão para alterar leads." };
  }

  const supabase = await createUserClient(true);

  // Só a coluna `status` é enviada — e, mesmo que alguém montasse um update
  // com outras colunas, o GRANT por coluna no Postgres recusaria (ver a
  // migração: `grant update (status) on public.leads to authenticated`).
  const { error } = await supabase.from("leads").update({ status }).eq("id", id);

  if (error) {
    console.error(
      JSON.stringify({ evento: "lead_status_erro", codigo: error.code, mensagem: error.message }),
    );
    return { error: "Não foi possível salvar o status agora." };
  }

  revalidatePath("/admin/leads");
  return { ok: true };
}
