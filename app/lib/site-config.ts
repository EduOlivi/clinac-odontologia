// TODO(product/owner) — mesmo placeholder que existia no site estático original
// (ver comentário em index.html linha 8 da versão pré-migração): a URL abaixo
// assume a demo citada no README (GitHub Pages) e é usada como base para a tag
// canonical e para os metadados Open Graph/Twitter. Confirme com o dono do
// site qual é a URL pública final ANTES do lançamento e defina a variável de
// ambiente NEXT_PUBLIC_SITE_URL no ambiente de deploy (Cloudflare Workers —
// configuração de infraestrutura fica a cargo de devops) em vez de editar
// este arquivo.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://eduolivi.github.io/clinac-odontologia";

export const SITE_NAME = "Clínac Odontologia";

// Número real confirmado pelo dono do site em 2026-08-14 (+55 31 98618-2875).
export const WHATSAPP_URL = "https://wa.me/5531986182875";
