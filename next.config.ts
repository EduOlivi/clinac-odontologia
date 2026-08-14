import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

/* ==========================================================================
   Deploy: Cloudflare Workers via OpenNext (@opennextjs/cloudflare)
   ==========================================================================
   Isto permite que `next dev` (o comando normal de desenvolvimento — nada
   muda no dia a dia) enxergue os bindings do Worker (o bind de
   auto-referência, os secrets) do jeito que eles existirão em produção, em
   vez de só process.env local. Sem isto, código que dependesse de um
   binding do Workers funcionaria em produção e quebraria em dev sem
   explicação. Ver docs/DEPLOY.md e
   https://opennext.js.org/cloudflare/get-started#12-develop-locally.
   ========================================================================== */
initOpenNextCloudflareForDev();
