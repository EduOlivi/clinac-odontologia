import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/* ==========================================================================
   open-next.config.ts — configuração do adapter OpenNext para Cloudflare
   ==========================================================================
   Sem overrides de propósito: nenhuma página deste site usa
   `revalidate`/ISR (a Home e as páginas legais são estáticas — geradas em
   build; o único trecho dinâmico é /admin, que já é `force-dynamic` e nunca
   precisa do cache incremental do Next). Sem override, o adapter usa um
   cache "dummy" (não persiste nada entre isolates) — para este site isso não
   é uma limitação real, é simplesmente a peça que não é usada.

   Se no futuro alguma página passar a usar `revalidate`, o próximo passo
   documentado pelo adapter é ligar `incrementalCache` com um bucket R2 (ver
   https://opennext.js.org/cloudflare/caching). Isso exige criar um bucket R2
   antes do deploy (`wrangler r2 bucket create <nome>`) — deliberadamente
   não feito agora para não pedir mais uma peça de infraestrutura ao dono do
   site sem uma página que precise dela.
   ========================================================================== */
export default defineCloudflareConfig();
