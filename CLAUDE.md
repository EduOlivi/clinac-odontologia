# CLAUDE.md

Este arquivo é só um ponteiro para um agente de IA trabalhando neste repo. A explicação completa do projeto está em [`README.md`](README.md) (o que é, como rodar, pendências de lançamento) e [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) (decisões técnicas, integração com Formspree, consentimento LGPD, analytics). Leia os dois antes de editar `index.html`.

## Específico deste repo para trabalho agêntico

- **`index.html` é um arquivo único** com HTML, CSS (`<style>`) e JS (`<script>`) inline — não há build step. Edite direto nele; não crie arquivos `.css`/`.js` separados sem que isso seja pedido explicitamente, pois quebraria a premissa de "zero dependências, zero build" do projeto.
- **O ID da Formspree vive em dois lugares que precisam ficar sincronizados**: o `action` da `<form id="booking-form">` e a constante `FORMSPREE_ENDPOINT` no `<script>`. Se editar um, edite o outro na mesma alteração — são a mesma configuração duplicada de propósito (fallback de segurança sem JS, ver `docs/ARQUITETURA.md`).
- **Salve arquivos `.md`/`.html` como UTF-8 sem BOM.** O `README.md` já chegou corrompido (mojibake/null bytes) uma vez neste repo por um save incorreto — confira a codificação antes de commitar se usar uma ferramenta que não seja um editor de texto padrão.
- **Não delete o arquivo `index`** (sem extensão, na raiz) sem confirmação explícita do dono do repo — é uma versão antiga do site (formulário falso, sem consentimento LGPD) que precisa de uma decisão humana (manter como referência vs. apagar), não de uma limpeza automática.
- **Não edite o conteúdo jurídico de `privacidade.html`/`termos.html`/`PRIVACIDADE.md`/`TERMOS.md`** além de manter os dois formatos sincronizados quando um mudar — são rascunhos explicitamente marcados como pendentes de revisão por advogado; preencher os campos `[PREENCHER]` com valores plausíveis não é uma tarefa para IA resolver sozinha.
- Depois de qualquer mudança em `index.html`/`privacidade.html`/`termos.html`, rode `node scripts/check-site.js` antes de considerar a tarefa concluída.
