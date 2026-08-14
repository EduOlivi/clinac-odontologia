import { redirect } from "next/navigation";
import { getStaffSession } from "../../lib/supabase/server";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  // Já logado e autorizado? Não faz sentido mostrar o formulário de novo.
  // (Logado mas fora da allowlist continua caindo aqui e vendo o login —
  // /admin/leads explica o que aconteceu.)
  const session = await getStaffSession();
  if (session?.isStaff) redirect("/admin/leads");

  return <LoginForm />;
}
