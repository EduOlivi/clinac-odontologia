import { redirect } from "next/navigation";
import { LEAD_STATUS_LABELS, type Lead } from "../../lib/leads";
import { createUserClient, getStaffSession } from "../../lib/supabase/server";
import { signOut } from "../actions";
import StatusForm from "./StatusForm";
import styles from "../admin.module.css";

/* ==========================================================================
   /admin/leads — a tela do "painel simples pra ver quem preencheu"
   ==========================================================================
   O que ela NÃO tem, de propósito: paginação, busca, filtro por status,
   exportação, gráfico. O volume esperado é de dezenas a poucas centenas de
   leads por mês; tudo isso resolve um problema que este site não tem, e cada
   um deles é mais código para manter e mais superfície para errar. Quando a
   tabela ficar desconfortável de ler, aí vale construir — e provavelmente
   começando por filtrar `status = 'novo'`.

   A leitura acontece com a SESSÃO DO USUÁRIO (chave `anon` + JWT), não com a
   `service_role`. Quem autoriza é a policy no Postgres. Consequência
   concreta: se esta página tivesse um bug de controle de acesso, o resultado
   seria uma tabela vazia — não um vazamento de dado de saúde.
   ========================================================================== */

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function Shell({ children }: { children: React.ReactNode }) {
  return <main className={styles.shell}>{children}</main>;
}

export default async function LeadsPage() {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");

  if (!session.isStaff) {
    // Logado, mas fora da allowlist `admin_users`. Autenticação e
    // autorização são perguntas diferentes — esta tela é a prova visível
    // disso. O texto explica o passo que falta em vez de dar um 403 seco.
    return (
      <Shell>
        <div className={styles.topbar}>
          <h1 className={styles.title}>Painel de leads</h1>
          <form action={signOut}>
            <button type="submit" className={styles.linkButton}>
              Sair
            </button>
          </form>
        </div>
        <p className={styles.notice}>
          A conta <strong>{session.email}</strong> está autenticada, mas não tem permissão para ver
          os leads. Peça a quem administra o projeto para incluí-la na tabela{" "}
          <code>admin_users</code> do Supabase (instruções em{" "}
          <code>supabase/migrations/20260814120000_leads.sql</code>).
        </p>
      </Shell>
    );
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, created_at, atualizado_em, nome, telefone, melhor_horario, tratamento, consentimento_lgpd, consentimento_marketing, politica_versao, status",
    )
    .order("created_at", { ascending: false })
    // Teto de segurança, não paginação: impede que um flood de spam
    // transforme esta página numa resposta de vários MB.
    .limit(500);

  if (error) {
    console.error(
      JSON.stringify({ evento: "admin_leads_erro", codigo: error.code, mensagem: error.message }),
    );
    return (
      <Shell>
        <p className={styles.error}>
          Não foi possível carregar os leads agora. Se o projeto Supabase estiver pausado, abra o
          painel do Supabase para reativá-lo e tente de novo.
        </p>
      </Shell>
    );
  }

  const leads = (data ?? []) as Lead[];
  const novos = leads.filter((lead) => lead.status === "novo").length;

  return (
    <Shell>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>Painel de leads</h1>
          <p className={styles.muted}>
            {leads.length} {leads.length === 1 ? "pedido" : "pedidos"} · {novos} sem contato
          </p>
        </div>
        <div className={styles.muted}>
          {session.email}{" "}
          <form action={signOut} style={{ display: "inline" }}>
            <button type="submit" className={styles.linkButton}>
              Sair
            </button>
          </form>
        </div>
      </div>

      {leads.length === 0 ? (
        <p className={styles.empty}>Nenhum pedido de avaliação ainda.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>
              Pedidos de avaliação recebidos pelo site
            </caption>
            <thead>
              <tr>
                <th scope="col">Recebido</th>
                <th scope="col">Nome</th>
                <th scope="col">Telefone</th>
                <th scope="col">Tratamento</th>
                <th scope="col">Melhor horário</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className={styles.nowrap}>{dataHora.format(new Date(lead.created_at))}</td>
                  <td>{lead.nome}</td>
                  <td className={styles.nowrap}>
                    {/* tel: para a recepção ligar direto do celular */}
                    <a href={`tel:${lead.telefone.replace(/[^\d+]/g, "")}`}>{lead.telefone}</a>
                  </td>
                  <td>{lead.tratamento}</td>
                  <td>{lead.melhor_horario ?? "—"}</td>
                  <td>
                    <StatusForm id={lead.id} status={lead.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className={styles.muted} style={{ marginTop: 28 }}>
        Legenda de status: {Object.values(LEAD_STATUS_LABELS).join(" · ")}. Pedido de exclusão de
        dados por um paciente é processo manual — ver{" "}
        <code>supabase/data-subject-requests.sql</code>.
      </p>
    </Shell>
  );
}
