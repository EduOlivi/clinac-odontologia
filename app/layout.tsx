import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "./lib/site-config";
import "./globals.css";

const DESCRIPTION =
  "Clínica odontológica em Belo Horizonte com limpeza, implantodontia, ortodontia, odontopediatria e clareamento. Agende sua avaliação com escaneamento digital e plano de tratamento por escrito.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Cuidado que se vê no sorriso`,
    template: `%s — ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Cuidado que se vê no sorriso`,
    description: DESCRIPTION,
    url: "/",
    // imagem em public/imagens, mesmo asset do site estático original
    images: [
      {
        url: "/imagens/foto%201.jpeg",
        alt: "Estrutura e consultório Clínac Odontologia",
      },
    ],
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Cuidado que se vê no sorriso`,
    description:
      "Clínica odontológica em Belo Horizonte com limpeza, implantodontia, ortodontia, odontopediatria e clareamento.",
    images: ["/imagens/foto%201.jpeg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Fontes carregadas via <link> externo (não via next/font) de propósito:
            privacidade.html §2.4 documenta, para o dono do site e para os
            titulares de dados, que o carregamento das fontes do Google
            transmite IP/dados do navegador à Google no momento em que a
            página abre. Trocar para next/font (self-hosted) mudaria esse
            comportamento e tornaria aquele texto jurídico desatualizado —
            e não temos autorização para editar conteúdo jurídico nesta
            tarefa. Se o dono do site decidir hospedar as fontes localmente
            no futuro, troque para next/font AQUI e peça pra compliance
            atualizar/remover a §2.4 da Política de Privacidade no mesmo PR. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- decisão intencional, ver comentário acima */}
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,450;0,9..144,600;1,9..144,450&family=Libre+Franklin:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
