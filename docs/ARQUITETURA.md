# Arquitetura — Clínac Odontologia

Este documento explica **como** o site funciona por dentro e **por quê** foi construído assim — para quem for mexer no projeto sem ter acompanhado as decisões, com ou sem ajuda de IA. Para o que o projeto é e como rodá-lo, veja o [`README.md`](../README.md).

O projeto é propositalmente pequeno: uma única página estática (`index.html`), sem framework, sem build, sem backend próprio. As decisões abaixo existem justamente para manter essa simplicidade sem abrir mão de LGPD, acessibilidade e um caminho de saída caso o site cresça.

---

## Visão geral

```
Navegador do usuário
  │
  ├── index.html (HTML + CSS + JS, tudo em um arquivo só)
  │     ├── formulário de agendamento ──► Formspree (formspree.io) ──► e-mail da clínica
  │     ├── trackEvent() ──► console.debug (hoje) / ferramenta de analytics (futuro)
  │     └── links ──► privacidade.html, termos.html
  │
  ├── privacidade.html / termos.html (páginas legais, geradas a partir de
  │     PRIVACIDADE.md / TERMOS.md — mesmo conteúdo, formatos diferentes)
  │
  └── scripts/check-site.js (rodado localmente antes de publicar, não faz
        parte do que é servido ao usuário)
```

Não existe servidor, banco de dados ou API própria. A única dependência externa em tempo de execução é a Formspree, usada apenas para o formulário de agendamento.

---

## Decisão: Formspree em vez de backend próprio

**Por quê.** O site não tem (e não precisa ter) servidor próprio — é hospedado como arquivos estáticos no GitHub Pages, que não executa código server-side. Para o formulário de agendamento funcionar sem um backend, as opções realistas eram um serviço de formulário como serviço (Formspree, Getform, EmailJS...) ou montar/hospedar um backend só para isso. Formspree foi escolhido pelo plano gratuito suficiente para o volume esperado de uma clínica, por não exigir nenhuma infraestrutura adicional e por devolver JSON (permitindo tratar sucesso/erro no próprio JS em vez de recarregar a página).

**Trade-off aceito.** Os dados do formulário — nome, telefone, tratamento de interesse — saem do navegador do usuário diretamente para os servidores da Formspree (Formspree, Inc., sediada nos EUA) antes de chegarem ao e-mail da clínica. Como o tratamento de interesse é dado de saúde (LGPD art. 11), isso é uma transferência internacional de dado sensível — daí o texto de consentimento específico no formulário e a menção explícita a isso em `privacidade.html` (ver seção sobre consentimento abaixo). A alternativa de hospedar um backend próprio evitaria esse trade-off, mas contradiria a decisão deliberada de manter o site 100% estático — o dono do site pode revisitar essa escolha se o volume ou a sensibilidade dos dados crescerem.

**Como o envio funciona.** O envio é feito por `fetch()` (AJAX) para manter o usuário na página e mostrar feedback inline — mas o `<form>` também tem `method="post"` e `action="https://formspree.io/f/..."` como esses mesmos valores usados pelo JS. Esse aparente dado duplicado é proposital: é o fallback de segurança caso o `<script>` falhe ao carregar ou executar (ex. `IntersectionObserver` ausente em um WebView antigo). Sem esse fallback, o navegador cairia no comportamento padrão de um `<form>` sem `method`/`action` explícitos, que é `GET` — e nome, telefone e dado de saúde vazariam pela URL, indo parar no histórico do navegador e em logs de servidor. **Os dois valores (no `<form action>` e na constante `FORMSPREE_ENDPOINT` do JS) precisam ser sempre atualizados juntos** — ver [Configuração necessária](../README.md#️-configuração-necessária-antes-de-publicar) no README.

**Anti-abuso.** Como o ID do formulário é público (aparece no código-fonte, não é segredo), qualquer pessoa pode, em tese, postar diretamente no endpoint da Formspree sem passar pelo site. A defesa é em camadas: campo honeypot `_gotcha` (invisível para humanos, preenchido só por bots que leem todo o HTML), rate limit e painel de moderação da própria Formspree, e — pendente de confirmação do dono do site — reCAPTCHA e restrição de domínio configurados no painel (ver pendências no README).

### Integração — Formspree (o único ponto de integração externa do site)

- **Como é endereçado.** `POST https://formspree.io/f/<FORM_ID>`, chamado via `fetch()` em `index.html` (bloco "4) Envio do formulário", perto do fim do arquivo) e replicado no `<form action>` como fallback sem JS.
- **O que entra.** Todo o `<form id="booking-form">` lido com `new FormData(form)` — ou seja, o JS é agnóstico ao nome dos campos; qualquer campo `name="..."` adicionado ao HTML passa a ser enviado automaticamente, sem mudar o JS. Campos atuais: `nome`, `telefone`, `melhor_horario`, `tratamento`, `consentimento_lgpd`, `consentimento_marketing`, `politica_versao` (versão da política aceita, hoje fixa em `"PRIVACIDADE v1.0 - 2026-08-13"`), `_subject` (assunto do e-mail, campo de controle da Formspree) e `_gotcha` (honeypot).
- **O que volta.** JSON. Sucesso: `response.ok` verdadeiro (a Formspree normalmente responde `200`). Erro: JSON no formato `{ errors: [{ message }] }` ou `{ error: "..." }`, tratado pela função `formspreeError()` no JS.
- **Quem pode chamar.** Qualquer cliente que conheça o endpoint (o ID é público) — não há autenticação. A defesa contra abuso está descrita acima (honeypot + painel Formspree + pendências de configuração no README).
- **Como falha.** Três casos tratados explicitamente no JS: (1) endpoint ainda com `YOUR_FORM_ID` — falha imediata, sem tentar a rede; (2) timeout de rede (`AbortController`, 15s) — evita o botão travado em "Enviando…" numa conexão ruim; (3) resposta HTTP de erro da Formspree — mensagem extraída de `formspreeError()`. Em todos os casos o usuário vê uma mensagem de erro com uma alternativa (WhatsApp/telefone) em vez de falha silenciosa.
- **O que muda.** Um envio bem-sucedido não altera nenhum estado no site (não há banco de dados) — o efeito é inteiramente externo: um e-mail chega à caixa configurada no painel da Formspree e o envio fica registrado no painel da Formspree por um tempo. Um envio bem-sucedido também dispara dois eventos internos (`clinac:form-submit-success` em `document`) consumidos pelo bloco de analytics — ver abaixo.

---

## Consentimento LGPD no formulário

O formulário lida com dado de saúde (o tratamento de interesse selecionado, LGPD art. 11) e transfere esse dado para fora do Brasil (Formspree, LGPD art. 33). Por isso o desenho do consentimento é deliberadamente mais explícito que um checkbox genérico de "aceito os termos":

- **Checkbox obrigatório** (`consentimento_lgpd`, `required`) — texto específico mencionando que o tratamento de interesse é dado de saúde e que os dados são armazenados nos EUA, com link para `privacidade.html` e `termos.html`. O texto foi definido por compliance e não deve ser parafraseado sem revisão.
- **Checkbox opcional** (`consentimento_marketing`, sem `required`) — separado do consentimento de dado de saúde, porque LGPD exige que consentimentos com finalidades diferentes sejam coletados separadamente (não é válido "empacotar" marketing junto do consentimento necessário para o atendimento).
- **Campo oculto `politica_versao`** — registra qual versão da política de privacidade o usuário aceitou no momento do envio, para rastreabilidade caso a política mude depois.
- **Verificação mecânica.** `scripts/check-site.js` falha o build se o checkbox `consentimento_lgpd` perder o atributo `required` (ex. por um refactor acidental) — é a única regra de negócio verificada automaticamente neste projeto, por ser a mais fácil de quebrar sem querer e a mais cara de quebrar sem perceber.

As páginas `privacidade.html` e `termos.html` (geradas a partir de `PRIVACIDADE.md`/`TERMOS.md`) são rascunhos de IA explicitamente marcados como não revisados por advogado, com campos `[PREENCHER]` em aberto — ver pendências no `README.md`. Isso não afeta o mecanismo de consentimento em si (que já funciona), apenas o conteúdo legal que ele referencia.

---

## Analytics: o padrão de troca única (`trackEvent`)

O site não tem nenhuma ferramenta de analytics conectada hoje. Em vez de decidir a ferramenta durante esta revisão, foi criado um único ponto de integração:

```js
function trackEvent(name, props) {
  console.debug('[Clínac][analytics]', name, props || {});
}
```

Toda a instrumentação do site chama só essa função — nunca uma SDK de analytics diretamente. Para ligar uma ferramenta de verdade, troca-se **apenas o corpo dessa função** (e se adiciona o snippet do provedor no `<head>`); nenhum outro ponto do arquivo precisa mudar. Hoje os eventos só vão para o console do navegador — nada sai do site.

**Eventos disparados** (nenhum carrega nome, telefone ou e-mail do usuário):
- `whatsapp_click` — clique nos dois pontos de contato do WhatsApp (`{ source: 'floating' | 'inline' }`)
- `form_submit_success` — só quando a Formspree confirma o envio (sem propriedades — é contagem de conversão, não registro de quem converteu)
- `treatment_interest_selected` — disparado junto com o anterior, lê o `<select>` de tratamento diretamente do DOM (`{ treatment: <rótulo da opção> }`), nunca associado a nome/telefone

**Recomendação registrada no código** (decisão do dono do site, não executada nesta revisão): uma ferramenta "privacy-first" sem cookies (Plausible, Fathom ou similar) em vez de GA4 — porque compliance já confirmou que o site hoje **não precisa** de banner de cookies, e GA4 reintroduziria essa exigência. Se uma ferramenta real for ligada, a frase em `privacidade.html` que hoje afirma que o site não usa nenhuma ferramenta de rastreamento **precisa ser atualizada na mesma mudança** (ver pendências no README).

---

## Um fluxo rastreado ponta a ponta: agendamento pelo formulário

Este é o caminho que exercita mais partes do sistema — do clique do usuário até o e-mail chegar na clínica e a tela atualizar.

1. **Usuário preenche o formulário** na seção `#contato` de `index.html` (campos `nome`, `telefone`, `melhor_horario`, `tratamento`) e marca o checkbox `consentimento_lgpd` (obrigatório — o navegador bloqueia o envio via HTML5 `required` se estiver desmarcado, sem precisar de JS para isso).
2. **Clique em "Solicitar avaliação"** dispara o listener `submit` registrado em `bookingForm` (bloco "4" do `<script>`, perto do fim do arquivo). `event.preventDefault()` impede o comportamento padrão do `<form>` (que seria navegar para `action` via GET).
3. **Guarda de configuração**: se `FORMSPREE_ENDPOINT` ainda tiver `YOUR_FORM_ID`, o fluxo para aqui — mostra mensagem de erro amigável e dispara `clinac:form-submit-error` com `reason: 'not_configured'`, sem tentar a rede.
4. **Estado de envio**: `setSending(true)` desabilita o botão e troca o texto para "Enviando…", evitando duplo envio.
5. **Requisição**: `fetch(FORMSPREE_ENDPOINT, { method: 'POST', body: new FormData(bookingForm), ... })`, com timeout de 15s via `AbortController`.
6. **Resposta da Formspree**: se `response.ok`, o JS dispara o evento customizado `clinac:form-submit-success` em `document` **antes** de limpar o formulário (`bookingForm.reset()`) — a ordem importa porque o listener de analytics (passo 7) precisa ler o `<select name="tratamento">` enquanto o valor ainda está no DOM.
7. **Analytics reage ao evento** (bloco "5" do `<script>`): o listener de `clinac:form-submit-success` chama `trackEvent('form_submit_success', {})` e, se houver um tratamento selecionado, `trackEvent('treatment_interest_selected', { treatment: <valor> })`. Hoje isso só imprime no console (ver seção acima).
8. **UI atualiza**: `showFeedback('success', ...)` exibe a mensagem de confirmação na área `#booking-feedback` (`role="status" aria-live="polite"`, então leitores de tela anunciam a mudança), o formulário é limpo e o botão volta ao texto original.
9. **Fora do site**: a Formspree recebe o payload, aplica suas próprias defesas (honeypot `_gotcha`, rate limit, moderação) e envia um e-mail para a caixa configurada no painel da Formspree — não há nenhum armazenamento próprio do site nesse processo.

Se qualquer etapa entre 5 e 9 falhar (rede, timeout, recusa da Formspree), o mesmo padrão se repete com `showFeedback('error', ...)` e um dos eventos `clinac:form-submit-error` (`reason: 'rejected' | 'network' | 'timeout'`), sempre com uma alternativa de contato (WhatsApp/telefone) na mensagem — nunca uma falha silenciosa.

---

## Acessibilidade — decisões não óbvias

Duas correções desta revisão valem registro porque não são óbvias ao ler o CSS isoladamente:

- **Foco visível sobre fundos escuros.** O outline padrão do navegador tem contraste insuficiente (~2.7:1) sobre os fundos verde-escuros do site (botões, caixa de agendamento, footer). Foi definido um anel de foco explícito (`outline: 2.5px solid var(--emerald-light)`) testado nos dois contextos de fundo do site.
- **`prefers-reduced-motion` estava quebrando o herói, não só desativando a animação.** A ilustração SVG do hero e os pontinhos decorativos dependiam da *animação* para sair do estado inicial (traço escondido / opacidade zero) até o estado final (traço desenhado / visível). Um `animation: none !important` ingênuo deixava esses elementos travados no estado inicial — ou seja, invisíveis — para quem pede para reduzir movimento, o oposto do que a preferência deveria significar. A correção fixa esses elementos no estado final quando `prefers-reduced-motion: reduce` está ativo, em vez de simplesmente cancelar a animação.

---

## Verificação automatizada

Não há framework de testes — seria desproporcional para um site estático de uma página. Existe apenas `scripts/check-site.js` (Node puro, zero dependências), descrito no [README](../README.md#-como-rodar-as-verificações). Ele intencionalmente não tenta validar conteúdo (textos, responsividade real) — só os erros mecânicos mais fáceis de introduzir sem perceber ao editar HTML à mão: link quebrado, `alt` faltando, o `required` do consentimento LGPD sumindo, ou o placeholder da Formspree esquecido.
