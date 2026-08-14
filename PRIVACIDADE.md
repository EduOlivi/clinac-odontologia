# Política de Privacidade — Clínac Odontologia

**Última atualização:** 14 de agosto de 2026
**Versão:** 2.0 (minuta — pendente de revisão jurídica)

> ⚠️ **AVISO — ESTE DOCUMENTO AINDA NÃO FOI REVISADO POR ADVOGADO.**
> Esta é uma minuta redigida com base no que o site efetivamente coleta hoje.
> Ela **não substitui** a análise de um advogado ou de um profissional
> especializado em proteção de dados, e não deve ser publicada como versão
> final sem essa revisão. Antes de publicar, remova este aviso **e** preencha
> todos os campos marcados como `[PREENCHER: ...]`.

> **O que mudou da v1.0 para a v2.0.** A v1.0 descrevia um site estático cujo
> formulário era enviado à **Formspree, Inc.**, hospedado no GitHub Pages. Essa
> arquitetura não existe mais. Hoje o site roda em **Cloudflare Workers**, os
> pedidos de avaliação são gravados em um banco **Supabase**, o aviso de novo
> pedido é enviado pela **Resend**, o backup semanal vai para um bucket
> **Cloudflare R2** e o formulário é protegido pelo **Cloudflare Turnstile**.
> Toda a seção 4 (compartilhamento e transferência internacional) e a seção 5
> (retenção) foram reescritas por causa disso. Quem enviou um formulário sob a
> v1.0 aceitou aquele texto — o registro de qual versão cada pessoa aceitou
> fica gravado junto do pedido (ver seção 10).

---

## 1. Quem somos (Controlador dos dados)

A Clínac Odontologia ("Clínac", "nós") é a **controladora** dos dados pessoais
coletados por meio deste site, nos termos do art. 5º, VI, da Lei nº 13.709/2018
(Lei Geral de Proteção de Dados — LGPD).

| Item | Informação |
|---|---|
| Razão social | `[PREENCHER: razão social completa da clínica]` |
| CNPJ | `[PREENCHER: CNPJ]` |
| Endereço | `[PREENCHER: endereço completo com CEP]` |
| Registro da pessoa jurídica no CRO-MG | `[PREENCHER: nº de inscrição da clínica no CRO-MG]` |
| Responsável Técnico | `[PREENCHER: nome do cirurgião-dentista responsável técnico]` |
| CRO do Responsável Técnico | `[PREENCHER: CRO-MG nº]` |
| Site | `[PREENCHER: URL pública do site]` |

**Canal de contato para assuntos de privacidade e dados pessoais:**
`[PREENCHER: e-mail dedicado, ex. privacidade@clinac.com.br]`
`[PREENCHER: telefone, se desejar oferecer atendimento por telefone]`

---

## 2. O que este site coleta

Esta política descreve **apenas** o tratamento de dados realizado por este site
institucional. O tratamento de dados de pacientes já em atendimento
(prontuário odontológico, exames, imagens, histórico clínico) ocorre fora deste
site e é regido por normas próprias, incluindo as do Conselho Federal de
Odontologia.

### 2.1 Dados que você nos fornece: formulário de agendamento

Ao preencher o formulário "Agendar avaliação", coletamos:

| Dado | Obrigatório? | Finalidade |
|---|---|---|
| Nome completo | Sim | Identificar você e personalizar o contato de retorno |
| Telefone / WhatsApp | Sim | Entrar em contato para agendar sua avaliação |
| Melhor horário para contato | Não | Ligar em um horário conveniente para você |
| Tratamento de interesse | Sim | Direcionar seu atendimento ao profissional adequado e preparar a consulta |

Junto com esses campos, o registro do seu pedido guarda também, de forma
automática: **data e hora do envio**, se você marcou (ou não) a caixa de
**comunicações promocionais**, a **versão desta política** vigente no momento
do envio, e o **estágio do atendimento** (novo, contatado, agendado,
compareceu), usado só para a equipe saber quem já recebeu retorno. O site
**não** grava o seu endereço IP junto do pedido — ver 2.4.

**Atenção — dado sensível.** O campo *"Tratamento de interesse"*, associado ao
seu nome e telefone, revela informação sobre a sua **saúde bucal ou sua
intenção de tratamento**. A LGPD classifica dado referente à saúde como **dado
pessoal sensível** (art. 5º, II) e exige, para tratá-lo, o seu **consentimento
específico e destacado** (art. 11, I). É exatamente por isso que o formulário
apresenta uma caixa de seleção obrigatória: sem a sua marcação, o pedido **não
é gravado** — essa checagem é feita no servidor, não só no navegador.

Não pedimos e não queremos receber, por este formulário, dados como CPF, RG,
número de convênio, histórico clínico detalhado, diagnósticos ou imagens.
**Não inclua esse tipo de informação nos campos livres.** Se você enviar
espontaneamente, apagaremos assim que identificarmos.

### 2.2 Por onde o seu pedido passa

Vale a pena descrever o caminho, porque ele explica as seções 4 e 5:

1. **O site é executado pela Cloudflare (Workers).** A Cloudflare processa a
   sua requisição no data center dela mais próximo de você — para quem acessa
   de Belo Horizonte, tipicamente já no Brasil. Não existe um "servidor único"
   com endereço fixo: a execução é distribuída globalmente por definição do
   produto. O Worker **não armazena** o seu pedido; ele apenas o recebe,
   valida e repassa.
2. **O pedido é gravado em um banco de dados Supabase.** É ali que o seu
   registro fica guardado, e é dali que a equipe da clínica o lê, por um painel
   interno protegido por login. A região desse banco está indicada na seção
   4.1.
3. **Um aviso é enviado por e-mail à clínica, pela Resend.** Esse e-mail leva
   **apenas nome, telefone, melhor horário e se você aceitou receber
   novidades** — o **tratamento de interesse não é enviado por e-mail**,
   justamente por ser dado de saúde; ele fica visível só no painel interno.
4. **Uma cópia de segurança semanal** de toda a tabela de pedidos é gravada,
   criptografada em repouso, em um bucket privado da própria Cloudflare (R2).
   Ver seções 4 e 5.

### 2.3 Verificação anti-robô (Cloudflare Turnstile)

Para impedir que robôs inundem o formulário com pedidos falsos — o que faria a
clínica **deixar de perceber pedidos reais** —, o formulário usa o
**Cloudflare Turnstile**.

O que isso significa na prática:

- ele carrega um **JavaScript da Cloudflare no seu navegador**, na página do
  formulário;
- ele lê **sinais do ambiente do seu navegador** (características do
  dispositivo e do comportamento da navegação) para decidir se há uma pessoa
  do outro lado;
- em algumas configurações ele pode **gravar um cookie próprio** no seu
  navegador (a Cloudflare classifica os cookies do seu sistema de desafio como
  **estritamente necessários**, e declara que **não** rastreia usuários de site
  em site nem de sessão em sessão, e que **não** os usa para publicidade);
- o seu **endereço IP** é enviado à Cloudflare como parte dessa verificação.

**O Turnstile não é uma ferramenta de análise de audiência e não constrói
perfil sobre você.** A finalidade é única e declarada: decidir se o envio do
formulário vem de uma pessoa ou de um robô. Se ele estiver indisponível, o
formulário recusa o envio e indica o WhatsApp como alternativa.

### 2.4 Dados técnicos e registros de segurança

O seu **endereço IP** é tratado, sem ser gravado junto do seu pedido, nas
seguintes situações:

- para **limitar envios repetidos** do mesmo dispositivo (proteção contra
  flood), em memória e de forma temporária;
- enviado à **Cloudflare** na verificação do Turnstile (2.3);
- registrado no **log do servidor** quando um envio é recusado por suspeita de
  robô. Esses logs ficam retidos pela Cloudflare por **3 dias** no plano
  utilizado e não são consultados para nenhuma outra finalidade.

O IP **não** é armazenado na tabela de pedidos, **não** entra no backup e
**não** é usado para identificar ou perfilar visitantes.

### 2.5 Fontes tipográficas (Google Fonts)

As fontes usadas no site são carregadas dos servidores da **Google LLC**
(`fonts.googleapis.com` e `fonts.gstatic.com`). Esse carregamento faz com que o
seu **endereço IP e informações do seu navegador** sejam transmitidos à Google,
nos Estados Unidos, no momento em que a página abre.

`[PREENCHER/REMOVER: se as fontes forem hospedadas localmente — recomendação
técnica desta política —, apague esta seção 2.5 por inteiro e a linha
correspondente das seções 3 e 4, pois a transmissão deixará de existir.]`

### 2.6 Cookies e análise de audiência

**Este site não usa Google Analytics, pixel de redes sociais, mapa de calor,
publicidade comportamental ou qualquer outra ferramenta de rastreamento de
audiência.** Nada é gravado no seu navegador para fins publicitários ou
estatísticos, e não há identificador que acompanhe você entre sessões ou entre
sites.

Os únicos cookies que podem existir são **estritamente necessários** ao
funcionamento do que você pediu:

| Cookie | Quando | Para quê |
|---|---|---|
| Cookie do desafio anti-robô (Cloudflare) | Ao carregar a página do formulário, em algumas configurações | Verificação anti-robô descrita em 2.3 |
| Cookie de sessão do painel interno | Apenas em `/admin`, apenas para a equipe da clínica após login | Manter a pessoa autenticada |

Como esses cookies são estritamente necessários e não servem a rastreamento,
publicidade ou medição de audiência, **este site não exibe banner de
consentimento de cookies**.

> Se alguma ferramenta de análise de audiência ou publicidade for adicionada no
> futuro, esta política precisará ser atualizada **e** o site precisará exibir
> um banner de consentimento antes de acionar o rastreamento.

### 2.7 WhatsApp

Os botões "Chamar no WhatsApp" e o botão flutuante apenas abrem uma conversa no
WhatsApp. Nenhum dado seu é enviado à Clínac antes de você iniciar a conversa.
A partir daí, a troca de mensagens é regida pela política de privacidade do
WhatsApp (Meta Platforms, Inc.).

---

## 3. Bases legais do tratamento (LGPD, arts. 7º, 11 e 33)

| Dado | Finalidade | Base legal |
|---|---|---|
| Nome, telefone, melhor horário | Retornar o contato e agendar a avaliação | Art. 7º, V — procedimentos preliminares relacionados a contrato, a pedido do titular |
| Tratamento de interesse (dado de saúde) | Preparar o atendimento adequado | Art. 11, I — **consentimento específico e destacado** do titular |
| Registro do consentimento (data/hora, versão da política aceita) | Comprovar que o consentimento foi obtido, como exige o art. 8º, § 2º | Art. 7º, II — cumprimento de obrigação legal/regulatória pela controladora |
| Transferência dos dados para serviços com infraestrutura fora do Brasil | Operar o formulário (ver seção 4) | Art. 33, VIII — **consentimento específico e destacado**, com informação prévia sobre o caráter internacional da transferência |
| IP e sinais do navegador (Cloudflare Turnstile e registros de segurança) | Impedir robôs e abuso do formulário | Art. 7º, IX — legítimo interesse |
| IP transmitido à Google (fontes) | Exibir o site com a tipografia da marca | Art. 7º, IX — legítimo interesse `[REMOVER se as fontes forem hospedadas localmente]` |
| Cópia de segurança semanal dos pedidos | Não perder pedidos de pacientes por falha técnica | Art. 7º, IX — legítimo interesse; e art. 11, II, "f" (para o dado de saúde contido no backup) `[VERIFICAR COM ADVOGADO: enquadramento do backup de dado sensível]` |
| Envio de promoções, campanhas e novidades | Marketing | Art. 7º, I — **consentimento livre, específico, opcional e revogável a qualquer momento** |

**Marketing é opcional e separado.** Você pode solicitar o agendamento sem
aceitar receber comunicações promocionais. Recusar o marketing **não** impede,
atrasa nem prejudica o seu atendimento. A revogação desse consentimento também
é independente: você pode continuar sendo nosso paciente e, ainda assim, pedir
para parar de receber promoções. O aviso interno que a clínica recebe quando
você envia o formulário é **transacional** (parte do atendimento que você
pediu), não marketing.

---

## 4. Com quem compartilhamos e para onde os dados vão

Estes são **todos** os terceiros que tocam em dados deste site hoje:

| Terceiro | Papel | Onde fica | O que recebe |
|---|---|---|---|
| **Supabase** (Supabase, Inc.) | Operador — banco de dados que armazena os pedidos | `[PREENCHER: região do projeto — ver 4.1]` | Nome, telefone, melhor horário, tratamento de interesse, consentimentos, data/hora, estágio do atendimento |
| **Cloudflare, Inc.** — Workers | Operador — execução do site | Rede global (processamento distribuído; sem região fixa) | Todo o conteúdo do formulário, em trânsito, no momento do envio; IP do visitante |
| **Cloudflare, Inc.** — R2 | Operador — cópia de segurança semanal, criptografada em repouso, em bucket privado | `[PREENCHER: região do bucket R2 — ver 4.1]` | Cópia integral da tabela de pedidos, **incluindo o tratamento de interesse** |
| **Cloudflare, Inc.** — Turnstile | Operador — verificação anti-robô | Rede global | IP e sinais do navegador do visitante (ver 2.3). **Não** recebe nome, telefone nem tratamento |
| **Resend** (Plus Five Five, Inc.) | Operador — envio do e-mail de aviso à clínica | Estados Unidos | Nome, telefone, melhor horário e se aceitou novidades. **Não** recebe o tratamento de interesse (ver 2.2) |
| `[PREENCHER: provedor de e-mail da clínica, ex. Google Workspace / Microsoft 365]` | Operador — caixa postal que recebe o aviso | `[PREENCHER]` | O mesmo conteúdo do e-mail de aviso |
| **Google LLC** | Entrega das fontes tipográficas | Estados Unidos | IP e dados do navegador `[REMOVER se fontes locais]` |

Não vendemos, alugamos nem cedemos seus dados pessoais a terceiros para fins
comerciais. Não usamos seus dados para decisões automatizadas nem para criação
de perfil.

> **Nota interna, a remover antes de publicar.** Existe uma chave de
> configuração (`LEAD_EMAIL_INCLUDE_HEALTH_DATA`) capaz de passar a incluir o
> tratamento de interesse no e-mail de aviso. Ela está **desligada**, e esta
> política foi escrita com ela desligada. **Ligá-la exige uma nova decisão de
> compliance e a atualização desta seção e da 4.1**, porque passaria a copiar
> dado de saúde para a Resend (EUA) e para a caixa postal da clínica.

### 4.1 Transferência internacional de dados (LGPD, art. 33)

> ⚠️ **BLOQUEADOR DE PUBLICAÇÃO — LEIA ANTES DE PUBLICAR.** Esta seção depende
> de duas informações que ainda não foram decididas pelo dono do site: **a
> região do projeto Supabase** e **a região do bucket R2 de backup**. Não é
> possível publicar esta política com as duas alternativas abaixo lado a lado:
> a LGPD exige informação **prévia, clara e específica** sobre o caráter
> internacional da transferência (art. 6º, VI, e art. 33, VIII), e um
> consentimento dado sobre "pode ser no Brasil ou pode ser no exterior" não é
> consentimento informado. **Escolha uma das duas redações abaixo, apague a
> outra, e só então publique.**

**Redação A — se o banco Supabase for criado em São Paulo (`sa-east-1`):**

> **Os dados do seu pedido são armazenados em servidores localizados no
> Brasil**, na região de São Paulo do provedor Supabase. O armazenamento
> principal, portanto, **não** constitui transferência internacional.
>
> Ainda assim, **partes do fluxo saem do Brasil**, e você precisa saber quais:
>
> - a **cópia de segurança semanal** é gravada em bucket da Cloudflare (R2). A
>   Cloudflare **não oferece região na América do Sul para esse produto** — as
>   regiões disponíveis são América do Norte, Europa, Ásia-Pacífico e Oceania.
>   Ou seja, **a cópia de segurança dos pedidos, incluindo o tratamento de
>   interesse (dado de saúde), fica armazenada fora do Brasil**, na região
>   `[PREENCHER: região do bucket]`;
> - o **aviso por e-mail** à clínica é enviado pela Resend, cujo processamento
>   ocorre nos **Estados Unidos** — ele leva nome, telefone e melhor horário,
>   **não** o tratamento de interesse;
> - a **verificação anti-robô** e a **execução do site** são feitas pela
>   Cloudflare em rede distribuída globalmente, o que pode significar
>   processamento fora do Brasil;
> - as **fontes tipográficas** transmitem o seu IP à Google, nos Estados
>   Unidos `[REMOVER se fontes locais]`.

**Redação B — se o banco Supabase ficar fora do Brasil:**

> **Os dados enviados pelo formulário deste site são armazenados fora do
> Brasil**, na região `[PREENCHER: região do projeto Supabase]`, além das
> transferências descritas abaixo:
>
> - a **cópia de segurança semanal** (Cloudflare R2), que inclui o **tratamento
>   de interesse (dado de saúde)**, fica na região `[PREENCHER]`;
> - o **aviso por e-mail** à clínica é processado pela Resend, nos **Estados
>   Unidos** (sem o tratamento de interesse);
> - a **verificação anti-robô** e a **execução do site** ocorrem na rede
>   global da Cloudflare;
> - as **fontes tipográficas** transmitem o seu IP à Google, nos Estados
>   Unidos `[REMOVER se fontes locais]`.

**Em qualquer das duas redações**, os países envolvidos **não** possuem decisão
de adequação da Autoridade Nacional de Proteção de Dados (ANPD). A
transferência é realizada com fundamento no **art. 33, VIII, da LGPD** — o seu
consentimento específico e destacado, prestado com informação prévia sobre o
caráter internacional da operação. Essa informação é apresentada a você na
própria caixa de consentimento do formulário, antes do envio.

`[VERIFICAR COM ADVOGADO: a Resolução CD/ANPD nº 19/2024 regulamentou a
transferência internacional e aprovou cláusulas-padrão contratuais. Confirmar
se, além do consentimento (art. 33, VIII), esta clínica deveria/poderia
apoiar-se também em garantias contratuais (art. 33, II) junto a estes
fornecedores, que hoje operam sob contratos de adesão baseados em cláusulas
europeias, e se há prazo de adequação já vencido aplicável ao caso.]`

Se você não concordar com essa transferência, **não utilize o formulário**.
Nesse caso, entre em contato conosco pelo telefone `[PREENCHER: telefone da
clínica]`, pelo WhatsApp, por e-mail ou presencialmente — esses canais não
dependem do envio do formulário deste site.

---

## 5. Por quanto tempo guardamos

| Situação | Prazo de retenção |
|---|---|
| Pedido de avaliação (qualquer estágio) | **12 meses** contados da última interação registrada. Depois disso, o registro é excluído do banco. O prazo vale inclusive para quem virou paciente: neste caso o histórico clínico passa a viver no **prontuário odontológico**, fora deste site, e manter uma segunda cópia aqui não teria finalidade |
| Cópias de segurança | As **8 cópias semanais mais recentes** (≈ 2 meses, rotativas). Um registro excluído do banco pode, portanto, sobreviver em cópia de segurança por **até cerca de 2 meses** antes de desaparecer por rotação |
| Prontuário odontológico (fora deste site) | `[PREENCHER: prazo confirmado com o responsável técnico / CRO-MG; usualmente no mínimo 10 anos contados do último atendimento]` |
| Consentimento de marketing | Enquanto não for revogado. O pedido de revogação é registrado **fora do banco** (registro administrativo da clínica) e guardado por **5 anos**, como prova de que foi atendido |
| Logs técnicos com IP (Cloudflare) | **3 dias**, prazo de retenção de log da plataforma no plano utilizado |
| Registros técnicos de terceiros (Google, Resend, provedor de e-mail) | Pelo prazo definido por cada um desses fornecedores, fora do nosso controle |

**Por que 12 meses.** É o prazo em que um pedido de avaliação ainda tem
finalidade real (retomar contato com quem demonstrou interesse dentro de um
ciclo anual de cuidado bucal). Passado isso, manter nome, telefone e uma
informação de saúde de alguém que nunca virou paciente contraria o princípio da
**necessidade** (LGPD, art. 6º, III).

**Como a exclusão é feita.** Manualmente, por consulta registrada no
repositório do projeto (`supabase/data-subject-requests.sql`), em duas frentes:
o banco de dados e as cópias de segurança dentro da janela de rotação.
Responsável pela rotina: `[PREENCHER: nome/cargo da pessoa responsável]`.
Periodicidade recomendada: **trimestral**.

---

## 6. Seus direitos como titular (LGPD, art. 18)

Você pode, a qualquer momento e gratuitamente, solicitar:

1. **Confirmação** de que tratamos dados seus;
2. **Acesso** aos seus dados;
3. **Correção** de dados incompletos, inexatos ou desatualizados;
4. **Anonimização, bloqueio ou eliminação** de dados desnecessários, excessivos ou tratados em desconformidade com a lei;
5. **Portabilidade** a outro fornecedor de serviço;
6. **Eliminação** dos dados tratados com base no seu consentimento;
7. **Informação** sobre com quem compartilhamos seus dados;
8. **Informação** sobre a possibilidade de não consentir e as consequências disso;
9. **Revogação do consentimento**, a qualquer momento e de forma gratuita.

**Como exercer:** envie o pedido para `[PREENCHER: e-mail de privacidade]`,
identificando-se. Responderemos em até **15 (quinze) dias** contados do
recebimento, conforme o art. 19, II, da LGPD.

**Como confirmamos que é você.** O formulário só coleta nome e telefone, então
o telefone é a chave de busca. Antes de exportar ou apagar qualquer coisa,
confirmamos a sua identidade por outro canal (por exemplo, uma ligação para o
próprio número informado) — responder a um pedido falso seria, em si, um
vazamento.

**Sobre a exclusão e as cópias de segurança.** Ao atender um pedido de
eliminação, removemos o registro do banco e também das cópias de segurança
ainda dentro da janela de rotação descrita na seção 5.

Você também pode apresentar reclamação diretamente à **ANPD**
(https://www.gov.br/anpd).

---

## 7. Crianças e adolescentes (LGPD, art. 14)

A Clínac atende crianças (odontopediatria), e "Odontopediatria" é uma das opções
do formulário. Por isso:

- **O formulário deste site deve ser preenchido exclusivamente por maiores de 18
  anos.** Se o agendamento é para uma criança ou adolescente, quem preenche deve
  ser o **pai, a mãe ou o responsável legal**, informando os próprios dados de
  contato.
- O tratamento de dados de **crianças menores de 12 anos** só é realizado
  mediante **consentimento específico e em destaque dado por pelo menos um dos
  pais ou responsável legal**, conforme o art. 14, § 1º, da LGPD. A aceitação
  genérica dos Termos de Uso não supre esse consentimento.
- Todo tratamento de dados de crianças e adolescentes é feito **no melhor
  interesse do menor** (art. 14, *caput*).
- Não condicionamos a participação em nenhuma atividade ao fornecimento de dados
  pessoais de crianças além do estritamente necessário (art. 14, § 4º).

Se identificarmos que um formulário foi preenchido diretamente por um menor sem
a intervenção do responsável, **excluiremos os dados** e retomaremos o contato
apenas com o responsável legal.

---

## 8. Segurança e resposta a incidentes

Medidas técnicas e administrativas efetivamente adotadas, proporcionais ao
porte da clínica:

- o banco de dados **nega acesso por padrão** (RLS): não existe caminho público
  de leitura ou escrita na tabela de pedidos, e a chave pública do banco não dá
  acesso a nada;
- a gravação de um pedido só acontece pelo servidor do próprio site, após
  validação e verificação anti-robô;
- o painel interno exige **login** e, além disso, que a conta esteja em uma
  **lista de permissão** mantida à mão pela clínica — "estar logado" não basta;
- a equipe do painel **não pode alterar nem apagar** nome, telefone,
  tratamento ou consentimento de um pedido; só pode mudar o estágio do
  atendimento;
- exclusão de dado de titular é **operação manual e registrada**, nunca um
  botão de um clique;
- o **tratamento de interesse (dado de saúde) não é enviado por e-mail nem
  gravado em logs**;
- transmissão sempre por conexão criptografada (HTTPS); cópias de segurança
  **criptografadas em repouso**, em bucket privado.

Nenhum sistema é totalmente imune. **Em caso de incidente de segurança que possa
acarretar risco ou dano relevante aos titulares**, adotaremos o seguinte
procedimento:

1. **Quem é acionado:** `[PREENCHER: nome/cargo do responsável pelo canal de
   privacidade]`, imediatamente ao tomar conhecimento do incidente.
2. **Prazo:** comunicação à **ANPD e aos titulares afetados em até 3 (três) dias
   úteis** contados do conhecimento de que o incidente afetou dados pessoais
   (art. 48 da LGPD e Resolução CD/ANPD nº 15/2024).
3. **Como comunicamos aos titulares:** contato direto por telefone/WhatsApp e/ou
   e-mail cadastrado, e, se não for possível alcançar todos, aviso destacado
   neste site.
4. **O que informamos:** natureza dos dados afetados, titulares envolvidos,
   medidas técnicas de proteção utilizadas, riscos envolvidos, motivo de eventual
   demora e as medidas adotadas para reverter ou mitigar os efeitos.
5. **Registro:** todo incidente é registrado internamente, mesmo quando não
   houver obrigação de comunicação.

---

## 9. Encarregado (DPO)

A Clínac se enquadra como **agente de tratamento de pequeno porte** e, nos
termos da **Resolução CD/ANPD nº 2/2022**, está dispensada da indicação formal
de Encarregado. Mantemos, contudo, o canal de comunicação exigido pela norma,
para titulares e para a ANPD:

`[PREENCHER: e-mail e responsável pelo canal de privacidade]`

`[VERIFICAR COM ADVOGADO: o regime diferenciado da Resolução nº 2/2022 não se
aplica a quem realiza tratamento de alto risco. Este site trata dado sensível
de saúde (critério específico), mas em volume pequeno (dezenas a poucas
centenas de pedidos por mês), o que não caracteriza "larga escala". Se o volume
crescer de forma relevante, esta dispensa precisa ser reavaliada e um
Encarregado formalmente indicado.]`

---

## 10. Alterações desta política e registro do consentimento

Podemos atualizar esta política. A data da "Última atualização" no topo sempre
indicará a versão vigente. Alterações relevantes na finalidade ou nas bases
legais serão comunicadas de forma destacada e, quando a lei exigir, mediante
novo consentimento.

**Cada pedido de avaliação guarda a versão desta política que estava vigente no
momento do envio** — assim, quem consentiu com uma versão anterior continua
vinculado ao texto que efetivamente leu, e conseguimos demonstrar isso se você
ou a ANPD perguntarem (art. 8º, § 2º, da LGPD).

---

## 11. Publicidade odontológica (pendência do responsável técnico)

`[PENDÊNCIA REGULATÓRIA — NÃO É QUESTÃO DE PROTEÇÃO DE DADOS, MAS BLOQUEIA A
PUBLICAÇÃO DO SITE.]`

> A **Resolução CFO-196/2019** restringe a publicidade odontológica e **veda a
> divulgação de depoimentos de pacientes**. A seção "Depoimentos" e as
> estatísticas do topo da página ("12 anos", "4.9/5 em mais de 800 avaliações",
> "500+ implantes"), que não têm fonte documentada, precisam do aval do
> **responsável técnico junto ao CRO-MG** antes da publicação definitiva. Isso
> não foi resolvido por nenhuma revisão técnica — **não é um ajuste de código**,
> é uma decisão da própria clínica.

---

## 12. Foro

`[PREENCHER: comarca — usualmente a do domicílio do consumidor, nos termos do
CDC. Confirmar com advogado.]`
