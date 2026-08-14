import type { Metadata } from "next";

/* ==========================================================================
   Layout do painel interno
   ==========================================================================
   `noindex, nofollow`: o painel lista nome, telefone e tratamento de
   interesse (dado de saúde). Ele já exige login — mas manter a URL fora do
   Google evita que alguém a descubra por curiosidade e fique tentando
   entrar, e evita que uma configuração errada no futuro vire resultado de
   busca. Custo zero, então não há motivo para não fazer.
   ========================================================================== */

export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false, nocache: true },
};

// O painel nunca pode ser servido de cache: os dados mudam a cada envio de
// formulário e dependem de quem está logado.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
