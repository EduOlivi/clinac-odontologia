import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "../components/legal/LegalLayout";
import styles from "../components/legal/legal.module.css";
import { SITE_NAME } from "../lib/site-config";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Política de Privacidade do site da Clínac Odontologia: quais dados coletamos no formulário de agendamento, com quem compartilhamos e seus direitos como titular sob a LGPD.",
  alternates: { canonical: "/privacidade" },
  openGraph: {
    type: "website",
    title: `Política de Privacidade — ${SITE_NAME}`,
    description:
      "Como o site da Clínac Odontologia trata os dados pessoais coletados no formulário de agendamento, nos termos da LGPD.",
    url: "/privacidade",
  },
};

/* ==========================================================================
   ESTA PÁGINA É UMA CÓPIA RENDERIZADA DE ../../PRIVACIDADE.md
   ==========================================================================
   As duas precisam dizer EXATAMENTE a mesma coisa. Existir em dois lugares é
   um risco de divergência conhecido e registrado (a v1.0 deste texto já ficou
   desatualizada em relação ao código por meses). Se você mudar o conteúdo
   jurídico aqui, mude no .md no mesmo commit — e vice-versa.

   >>> AO MUDAR A SUBSTÂNCIA DESTE TEXTO, BUMPE A VERSÃO <<<
   `CURRENT_POLICY_VERSION` em app/lib/leads.ts grava, junto de cada pedido,
   qual versão da política o titular aceitou (LGPD art. 8º, § 2º). Mudar o que
   a política diz sem bumpar aquela constante amarra consentimentos antigos a
   um texto que eles nunca viram.
   ========================================================================== */
export default function PrivacidadePage() {
  return (
    <LegalLayout
      title="Política de Privacidade"
      lastUpdated="Última atualização: 20 de agosto de 2026 · Versão 2.1 (minuta — pendente de revisão jurídica)"
      warning={
        <>
          <strong>⚠️ AVISO — ESTE DOCUMENTO AINDA NÃO FOI REVISADO POR ADVOGADO.</strong>
          <br />
          <br />
          Esta é uma minuta redigida com base no que o site efetivamente coleta hoje. Ela{" "}
          <strong>não substitui</strong> a análise de um advogado ou de um profissional
          especializado em proteção de dados, e não deve ser publicada como versão final sem essa
          revisão. Antes de publicar, remova este aviso <strong>e</strong> preencha todos os campos
          marcados em <span className={styles.fill}>destaque</span>.
        </>
      }
      docNav={
        <>
          <Link href="/termos">Ver Termos de Uso →</Link>
          <Link href="/">← Voltar à página inicial</Link>
        </>
      }
      footerSecondaryLink={<Link href="/termos">Termos de Uso</Link>}
    >
      <div className={styles.warn}>
        <strong>O que mudou da v1.0 para a v2.0.</strong> A v1.0 descrevia um site estático cujo
        formulário era enviado à <strong>Formspree, Inc.</strong>, hospedado no GitHub Pages. Essa
        arquitetura não existe mais. Hoje o site roda em <strong>Cloudflare Workers</strong>, os
        pedidos de avaliação são gravados em um banco <strong>Supabase</strong>, o backup semanal
        vai para um bucket <strong>Cloudflare R2</strong> e o formulário é protegido pelo{" "}
        <strong>Cloudflare Turnstile</strong>. As seções 4 e 5 foram reescritas por causa disso.
      </div>

      <div className={styles.warn}>
        <strong>O que mudou da v2.0 para a v2.1 (2026-08-20).</strong> A clínica decidiu{" "}
        <strong>não</strong> usar a Resend para aviso de novo pedido por e-mail — o e-mail é muito
        movimentado e o time só confia mesmo no WhatsApp, canal que acompanham o dia todo. A Resend
        foi removida da lista de operadores (não processa mais nenhum dado deste site). Em troca,
        depois de um envio confirmado, o site mostra um botão{" "}
        <strong>&ldquo;Confirmar pelo WhatsApp&rdquo;</strong>: um link <code>wa.me</code> com uma
        mensagem já preenchida (nome, tratamento de interesse, melhor horário) que{" "}
        <strong>o próprio visitante escolhe enviar ou não</strong> — não é uma automação do lado do
        servidor, é o mesmo mecanismo do botão flutuante de WhatsApp que já existia, só que agora
        com o texto pronto. Ver seções 2.2 e 4.
        <br />
        <br />
        Quem enviou um formulário sob uma versão anterior aceitou aquele texto — o registro de qual
        versão cada pessoa aceitou fica gravado junto do pedido (ver seção 10).
      </div>

      <h2>1. Quem somos (Controlador dos dados)</h2>
      <p>
        A Clínac Odontologia (&ldquo;Clínac&rdquo;, &ldquo;nós&rdquo;) é a{" "}
        <strong>controladora</strong> dos dados pessoais coletados por meio deste site, nos termos
        do art. 5º, VI, da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados — LGPD).
      </p>
      <table>
        <tbody>
          <tr>
            <th>Item</th>
            <th>Informação</th>
          </tr>
          <tr>
            <td>Razão social</td>
            <td>
              <span className={styles.fill}>[PREENCHER: razão social completa da clínica]</span>
            </td>
          </tr>
          <tr>
            <td>CNPJ</td>
            <td>
              <span className={styles.fill}>[PREENCHER: CNPJ]</span>
            </td>
          </tr>
          <tr>
            <td>Endereço</td>
            <td>Rua Desembargador Ribeiro da Luz, 462 — Barreiro, Belo Horizonte/MG, 30640-040</td>
          </tr>
          <tr>
            <td>Registro da pessoa jurídica no CRO-MG</td>
            <td>EPAO 4909</td>
          </tr>
          <tr>
            <td>Responsável Técnico</td>
            <td>Simone Oliveira</td>
          </tr>
          <tr>
            <td>CRO do Responsável Técnico</td>
            <td>CRO-MG 49483</td>
          </tr>
          <tr>
            <td>Site</td>
            <td>
              <span className={styles.fill}>[PREENCHER: URL pública do site — depende do domínio final, ver docs/DEPLOY.md]</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Canal de contato para assuntos de privacidade e dados pessoais:</strong>
        <br />
        clinacodonto@gmail.com
        <br />
        (31) 98618-2875
      </p>

      <h2>2. O que este site coleta</h2>
      <p>
        Esta política descreve <strong>apenas</strong> o tratamento de dados realizado por este
        site institucional. O tratamento de dados de pacientes já em atendimento (prontuário
        odontológico, exames, imagens, histórico clínico) ocorre fora deste site e é regido por
        normas próprias, incluindo as do Conselho Federal de Odontologia.
      </p>

      <h3>2.1 Dados que você nos fornece: formulário de agendamento</h3>
      <p>Ao preencher o formulário &ldquo;Agendar avaliação&rdquo;, coletamos:</p>
      <table>
        <tbody>
          <tr>
            <th>Dado</th>
            <th>Obrigatório?</th>
            <th>Finalidade</th>
          </tr>
          <tr>
            <td>Nome completo</td>
            <td>Sim</td>
            <td>Identificar você e personalizar o contato de retorno</td>
          </tr>
          <tr>
            <td>Telefone / WhatsApp</td>
            <td>Sim</td>
            <td>Entrar em contato para agendar sua avaliação</td>
          </tr>
          <tr>
            <td>Melhor horário para contato</td>
            <td>Não</td>
            <td>Ligar em um horário conveniente para você</td>
          </tr>
          <tr>
            <td>Tratamento de interesse</td>
            <td>Sim</td>
            <td>Direcionar seu atendimento ao profissional adequado e preparar a consulta</td>
          </tr>
        </tbody>
      </table>
      <p>
        Junto com esses campos, o registro do seu pedido guarda também, de forma automática:{" "}
        <strong>data e hora do envio</strong>, se você marcou (ou não) a caixa de{" "}
        <strong>comunicações promocionais</strong>, a <strong>versão desta política</strong>{" "}
        vigente no momento do envio, e o <strong>estágio do atendimento</strong> (novo, contatado,
        agendado, compareceu), usado só para a equipe saber quem já recebeu retorno. O site{" "}
        <strong>não</strong> grava o seu endereço IP junto do pedido — ver 2.4.
      </p>
      <p>
        <strong>Atenção — dado sensível.</strong> O campo <em>&ldquo;Tratamento de interesse&rdquo;</em>,
        associado ao seu nome e telefone, revela informação sobre a sua{" "}
        <strong>saúde bucal ou sua intenção de tratamento</strong>. A LGPD classifica dado
        referente à saúde como <strong>dado pessoal sensível</strong> (art. 5º, II) e exige, para
        tratá-lo, o seu <strong>consentimento específico e destacado</strong> (art. 11, I). É
        exatamente por isso que o formulário apresenta uma caixa de seleção obrigatória: sem a sua
        marcação, o pedido <strong>não é gravado</strong> — essa checagem é feita no servidor, não
        só no navegador.
      </p>
      <p>
        Não pedimos e não queremos receber, por este formulário, dados como CPF, RG, número de
        convênio, histórico clínico detalhado, diagnósticos ou imagens.{" "}
        <strong>Não inclua esse tipo de informação nos campos livres.</strong> Se você enviar
        espontaneamente, apagaremos assim que identificarmos.
      </p>

      <h3>2.2 Por onde o seu pedido passa</h3>
      <p>Vale a pena descrever o caminho, porque ele explica as seções 4 e 5:</p>
      <ol>
        <li>
          <strong>O site é executado pela Cloudflare (Workers).</strong> A Cloudflare processa a
          sua requisição no data center dela mais próximo de você — para quem acessa de Belo
          Horizonte, tipicamente já no Brasil. Não existe um &ldquo;servidor único&rdquo; com
          endereço fixo: a execução é distribuída globalmente por definição do produto. O Worker{" "}
          <strong>não armazena</strong> o seu pedido; ele apenas o recebe, valida e repassa.
        </li>
        <li>
          <strong>O pedido é gravado em um banco de dados Supabase.</strong> É ali que o seu
          registro fica guardado, e é dali que a equipe da clínica o lê, por um painel interno
          protegido por login. A região desse banco está indicada na seção 4.1.
        </li>
        <li>
          <strong>Uma cópia de segurança semanal</strong> de toda a tabela de pedidos é gravada,
          criptografada em repouso, em um bucket privado da própria Cloudflare (R2). Ver seções 4
          e 5.
        </li>
        <li>
          <strong>Depois de um envio confirmado, você pode escolher confirmar pelo WhatsApp.</strong>{" "}
          O site mostra um botão &ldquo;Confirmar pelo WhatsApp&rdquo; com uma mensagem já
          preenchida (seu nome, o tratamento de interesse escolhido e o melhor horário, se
          informado). <strong>Isso é opcional e só acontece se você clicar</strong> — é um link
          comum (<code>wa.me</code>), o mesmo mecanismo do botão flutuante de WhatsApp que já
          existe no site, sem nenhuma automação do nosso lado. Ao clicar, seu navegador é
          direcionado ao WhatsApp com o texto pronto no campo de digitação;{" "}
          <strong>você decide se envia</strong>. Como é um redirecionamento normal de link, os
          dados que aparecem no texto passam pelo WhatsApp (Meta Platforms, Inc.) nesse momento —
          ver seção 4.
        </li>
      </ol>

      <h3>2.3 Verificação anti-robô (Cloudflare Turnstile)</h3>
      <p>
        Para impedir que robôs inundem o formulário com pedidos falsos — o que faria a clínica{" "}
        <strong>deixar de perceber pedidos reais</strong> —, o formulário usa o{" "}
        <strong>Cloudflare Turnstile</strong>. O que isso significa na prática:
      </p>
      <ul>
        <li>
          ele carrega um <strong>JavaScript da Cloudflare no seu navegador</strong>, na página do
          formulário;
        </li>
        <li>
          ele lê <strong>sinais do ambiente do seu navegador</strong> (características do
          dispositivo e do comportamento da navegação) para decidir se há uma pessoa do outro lado;
        </li>
        <li>
          em algumas configurações ele pode <strong>gravar um cookie próprio</strong> no seu
          navegador (a Cloudflare classifica os cookies do seu sistema de desafio como{" "}
          <strong>estritamente necessários</strong>, e declara que <strong>não</strong> rastreia
          usuários de site em site nem de sessão em sessão, e que <strong>não</strong> os usa para
          publicidade);
        </li>
        <li>
          o seu <strong>endereço IP</strong> é enviado à Cloudflare como parte dessa verificação.
        </li>
      </ul>
      <p>
        <strong>
          O Turnstile não é uma ferramenta de análise de audiência e não constrói perfil sobre
          você.
        </strong>{" "}
        A finalidade é única e declarada: decidir se o envio do formulário vem de uma pessoa ou de
        um robô. Se ele estiver indisponível, o formulário recusa o envio e indica o WhatsApp como
        alternativa.
      </p>

      <h3>2.4 Dados técnicos e registros de segurança</h3>
      <p>
        O seu <strong>endereço IP</strong> é tratado, sem ser gravado junto do seu pedido, nas
        seguintes situações:
      </p>
      <ul>
        <li>
          para <strong>limitar envios repetidos</strong> do mesmo dispositivo (proteção contra
          flood), em memória e de forma temporária;
        </li>
        <li>
          enviado à <strong>Cloudflare</strong> na verificação do Turnstile (2.3);
        </li>
        <li>
          registrado no <strong>log do servidor</strong> quando um envio é recusado por suspeita de
          robô. Esses logs ficam retidos pela Cloudflare por <strong>3 dias</strong> no plano
          utilizado e não são consultados para nenhuma outra finalidade.
        </li>
      </ul>
      <p>
        O IP <strong>não</strong> é armazenado na tabela de pedidos, <strong>não</strong> entra no
        backup e <strong>não</strong> é usado para identificar ou perfilar visitantes.
      </p>

      <h3>2.5 Fontes tipográficas (Google Fonts)</h3>
      <p>
        As fontes usadas no site são carregadas dos servidores da <strong>Google LLC</strong> (
        <code>fonts.googleapis.com</code> e <code>fonts.gstatic.com</code>). Esse carregamento faz
        com que o seu <strong>endereço IP e informações do seu navegador</strong> sejam
        transmitidos à Google, nos Estados Unidos, no momento em que a página abre.
      </p>
      <p>
        <span className={styles.fill}>
          [PREENCHER/REMOVER: se as fontes forem hospedadas localmente — recomendação técnica desta
          política —, apague esta seção 2.5 por inteiro e a linha correspondente das seções 3 e 4,
          pois a transmissão deixará de existir.]
        </span>
      </p>

      <h3>2.6 Cookies e análise de audiência</h3>
      <p>
        <strong>
          Este site não usa Google Analytics, pixel de redes sociais, mapa de calor, publicidade
          comportamental ou qualquer outra ferramenta de rastreamento de audiência.
        </strong>{" "}
        Nada é gravado no seu navegador para fins publicitários ou estatísticos, e não há
        identificador que acompanhe você entre sessões ou entre sites.
      </p>
      <p>
        Os únicos cookies que podem existir são <strong>estritamente necessários</strong> ao
        funcionamento do que você pediu:
      </p>
      <table>
        <tbody>
          <tr>
            <th>Cookie</th>
            <th>Quando</th>
            <th>Para quê</th>
          </tr>
          <tr>
            <td>Cookie do desafio anti-robô (Cloudflare)</td>
            <td>Ao carregar a página do formulário, em algumas configurações</td>
            <td>Verificação anti-robô descrita em 2.3</td>
          </tr>
          <tr>
            <td>Cookie de sessão do painel interno</td>
            <td>
              Apenas em <code>/admin</code>, apenas para a equipe da clínica após login
            </td>
            <td>Manter a pessoa autenticada</td>
          </tr>
        </tbody>
      </table>
      <p>
        Como esses cookies são estritamente necessários e não servem a rastreamento, publicidade ou
        medição de audiência, <strong>este site não exibe banner de consentimento de cookies</strong>.
      </p>
      <p>
        Se alguma ferramenta de análise de audiência ou publicidade for adicionada no futuro, esta
        política precisará ser atualizada <strong>e</strong> o site precisará exibir um banner de
        consentimento antes de acionar o rastreamento.
      </p>

      <h3>2.7 WhatsApp</h3>
      <p>
        Os botões &ldquo;Chamar no WhatsApp&rdquo; e o botão flutuante apenas abrem uma conversa no
        WhatsApp. Nenhum dado seu é enviado à Clínac antes de você iniciar a conversa. A partir
        daí, a troca de mensagens é regida pela política de privacidade do WhatsApp (Meta
        Platforms, Inc.).
      </p>

      <h2>3. Bases legais do tratamento (LGPD, arts. 7º, 11 e 33)</h2>
      <table>
        <tbody>
          <tr>
            <th>Dado</th>
            <th>Finalidade</th>
            <th>Base legal</th>
          </tr>
          <tr>
            <td>Nome, telefone, melhor horário</td>
            <td>Retornar o contato e agendar a avaliação</td>
            <td>Art. 7º, V — procedimentos preliminares relacionados a contrato, a pedido do titular</td>
          </tr>
          <tr>
            <td>Tratamento de interesse (dado de saúde)</td>
            <td>Preparar o atendimento adequado</td>
            <td>
              Art. 11, I — <strong>consentimento específico e destacado</strong> do titular
            </td>
          </tr>
          <tr>
            <td>Registro do consentimento (data/hora, versão da política aceita)</td>
            <td>Comprovar que o consentimento foi obtido, como exige o art. 8º, § 2º</td>
            <td>Art. 7º, II — cumprimento de obrigação legal/regulatória pela controladora</td>
          </tr>
          <tr>
            <td>Transferência dos dados para serviços com infraestrutura fora do Brasil</td>
            <td>Operar o formulário (ver seção 4)</td>
            <td>
              Art. 33, VIII — <strong>consentimento específico e destacado</strong>, com informação
              prévia sobre o caráter internacional da transferência
            </td>
          </tr>
          <tr>
            <td>IP e sinais do navegador (Cloudflare Turnstile e registros de segurança)</td>
            <td>Impedir robôs e abuso do formulário</td>
            <td>Art. 7º, IX — legítimo interesse</td>
          </tr>
          <tr>
            <td>IP transmitido à Google (fontes)</td>
            <td>Exibir o site com a tipografia da marca</td>
            <td>
              Art. 7º, IX — legítimo interesse{" "}
              <span className={styles.fill}>[REMOVER se as fontes forem hospedadas localmente]</span>
            </td>
          </tr>
          <tr>
            <td>Cópia de segurança semanal dos pedidos</td>
            <td>Não perder pedidos de pacientes por falha técnica</td>
            <td>
              Art. 7º, IX — legítimo interesse; e art. 11, II, &ldquo;f&rdquo; (para o dado de saúde
              contido no backup){" "}
              <span className={styles.fill}>
                [VERIFICAR COM ADVOGADO: enquadramento do backup de dado sensível]
              </span>
            </td>
          </tr>
          <tr>
            <td>Envio de promoções, campanhas e novidades</td>
            <td>Marketing</td>
            <td>
              Art. 7º, I —{" "}
              <strong>consentimento livre, específico, opcional e revogável a qualquer momento</strong>
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Marketing é opcional e separado.</strong> Você pode solicitar o agendamento sem
        aceitar receber comunicações promocionais. Recusar o marketing <strong>não</strong>{" "}
        impede, atrasa nem prejudica o seu atendimento. A revogação desse consentimento também é
        independente: você pode continuar sendo nosso paciente e, ainda assim, pedir para parar de
        receber promoções. O aviso interno que a clínica recebe quando você envia o formulário é{" "}
        <strong>transacional</strong> (parte do atendimento que você pediu), não marketing.
      </p>

      <h2>4. Com quem compartilhamos e para onde os dados vão</h2>
      <p>Estes são <strong>todos</strong> os terceiros que tocam em dados deste site hoje:</p>
      <table>
        <tbody>
          <tr>
            <th>Terceiro</th>
            <th>Papel</th>
            <th>Onde fica</th>
            <th>O que recebe</th>
          </tr>
          <tr>
            <td>
              <strong>Supabase</strong> (Supabase, Inc.)
            </td>
            <td>Operador — banco de dados que armazena os pedidos</td>
            <td>
              <span className={styles.fill}>[PREENCHER: região do projeto — ver 4.1]</span>
            </td>
            <td>
              Nome, telefone, melhor horário, tratamento de interesse, consentimentos, data/hora,
              estágio do atendimento
            </td>
          </tr>
          <tr>
            <td>
              <strong>Cloudflare, Inc.</strong> — Workers
            </td>
            <td>Operador — execução do site</td>
            <td>Rede global (processamento distribuído; sem região fixa)</td>
            <td>Todo o conteúdo do formulário, em trânsito, no momento do envio; IP do visitante</td>
          </tr>
          <tr>
            <td>
              <strong>Cloudflare, Inc.</strong> — R2
            </td>
            <td>
              Operador — cópia de segurança semanal, criptografada em repouso, em bucket privado
            </td>
            <td>América do Norte, leste (ENAM)</td>
            <td>
              Cópia integral da tabela de pedidos, <strong>incluindo o tratamento de interesse</strong>
            </td>
          </tr>
          <tr>
            <td>
              <strong>Cloudflare, Inc.</strong> — Turnstile
            </td>
            <td>Operador — verificação anti-robô</td>
            <td>Rede global</td>
            <td>
              IP e sinais do navegador do visitante (ver 2.3). <strong>Não</strong> recebe nome,
              telefone nem tratamento
            </td>
          </tr>
          <tr>
            <td>
              <strong>WhatsApp</strong> (Meta Platforms, Inc.)
            </td>
            <td>
              Operador — só se você clicar em &ldquo;Confirmar pelo WhatsApp&rdquo; após o envio;{" "}
              <strong>opcional</strong>, nunca automático
            </td>
            <td>Estados Unidos</td>
            <td>
              Nome, tratamento de interesse (<strong>dado de saúde</strong>) e melhor horário, no
              texto pré-preenchido da mensagem (ver 2.2). O telefone não vai no texto, mas fica
              implícito por ser uma conversa de WhatsApp
            </td>
          </tr>
          <tr>
            <td>
              <strong>Google LLC</strong>
            </td>
            <td>Entrega das fontes tipográficas</td>
            <td>Estados Unidos</td>
            <td>
              IP e dados do navegador <span className={styles.fill}>[REMOVER se fontes locais]</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Não vendemos, alugamos nem cedemos seus dados pessoais a terceiros para fins comerciais.
        Não usamos seus dados para decisões automatizadas nem para criação de perfil.
      </p>
      <div className={styles.warn}>
        <strong>Nota interna, a remover antes de publicar.</strong> O código ainda tem a
        integração com a Resend (e uma chave de configuração,{" "}
        <code>LEAD_EMAIL_INCLUDE_HEALTH_DATA</code>, que controlaria se o tratamento de interesse
        iria no e-mail) — mas <strong>desde 2026-08-20 nenhuma credencial da Resend está
        configurada</strong>, então nada é enviado por lá de fato. Se um dia a clínica voltar a
        usar aviso por e-mail, isso volta a exigir uma decisão de compliance e a reescrita desta
        seção e da 4.1.
      </div>

      <h3>4.1 Transferência internacional de dados (LGPD, art. 33)</h3>
      <div className={styles.warn}>
        <strong>Decidido em 2026-08-19.</strong> O projeto Supabase deste site foi criado na região{" "}
        <strong>South America (São Paulo)</strong>. A redação abaixo reflete essa escolha — não há
        mais alternativa em aberto.
      </div>

      <p>
        <strong>Os dados do seu pedido são armazenados em servidores localizados no Brasil</strong>,
        na região de São Paulo do provedor Supabase. O armazenamento principal, portanto,{" "}
        <strong>não</strong> constitui transferência internacional. Ainda assim,{" "}
        <strong>partes do fluxo saem do Brasil</strong>, e você precisa saber quais:
      </p>
      <ul>
        <li>
          a <strong>cópia de segurança semanal</strong> é gravada em bucket da Cloudflare (R2). A
          Cloudflare <strong>não oferece região na América do Sul para esse produto</strong> — as
          regiões disponíveis são América do Norte, Europa, Ásia-Pacífico e Oceania. Ou seja,{" "}
          <strong>
            a cópia de segurança dos pedidos, incluindo o tratamento de interesse (dado de saúde),
            fica armazenada fora do Brasil
          </strong>
          , na região América do Norte, leste (ENAM);
        </li>
        <li>
          a <strong>verificação anti-robô</strong> e a <strong>execução do site</strong> são feitas
          pela Cloudflare em rede distribuída globalmente, o que pode significar processamento fora
          do Brasil;
        </li>
        <li>
          as <strong>fontes tipográficas</strong> transmitem o seu IP à Google, nos Estados Unidos;
        </li>
        <li>
          <strong>se, e só se, você clicar em &ldquo;Confirmar pelo WhatsApp&rdquo;</strong> depois
          de um envio, seu nome, o tratamento de interesse (dado de saúde) e o melhor horário
          passam pelo WhatsApp (Meta Platforms, Inc.), nos Estados Unidos — isso é opcional e nunca
          acontece de forma automática (ver 2.2).
        </li>
      </ul>

      <p>
        Os países envolvidos <strong>não</strong> possuem decisão de adequação da Autoridade
        Nacional de Proteção de Dados (ANPD). A transferência é realizada com fundamento no{" "}
        <strong>art. 33, VIII, da LGPD</strong> — o seu consentimento específico e destacado,
        prestado com informação prévia sobre o caráter
        internacional da operação. Essa informação é apresentada a você na própria caixa de
        consentimento do formulário, antes do envio.
      </p>
      <p>
        <span className={styles.fill}>
          [VERIFICAR COM ADVOGADO: a Resolução CD/ANPD nº 19/2024 regulamentou a transferência
          internacional e aprovou cláusulas-padrão contratuais. Confirmar se, além do consentimento
          (art. 33, VIII), esta clínica deveria/poderia apoiar-se também em garantias contratuais
          (art. 33, II) junto a estes fornecedores, que hoje operam sob contratos de adesão
          baseados em cláusulas europeias, e se há prazo de adequação já vencido aplicável ao caso.]
        </span>
      </p>
      <p>
        Se você não concordar com essa transferência, <strong>não utilize o formulário</strong>.
        Nesse caso, entre em contato conosco pelo telefone (31) 98618-2875, pelo WhatsApp, por
        e-mail (clinacodonto@gmail.com) ou presencialmente — esses canais não dependem do envio do
        formulário deste site.
      </p>

      <h2>5. Por quanto tempo guardamos</h2>
      <table>
        <tbody>
          <tr>
            <th>Situação</th>
            <th>Prazo de retenção</th>
          </tr>
          <tr>
            <td>Pedido de avaliação (qualquer estágio)</td>
            <td>
              <strong>12 meses</strong> contados da última interação registrada. Depois disso, o
              registro é excluído do banco. O prazo vale inclusive para quem virou paciente: neste
              caso o histórico clínico passa a viver no <strong>prontuário odontológico</strong>,
              fora deste site, e manter uma segunda cópia aqui não teria finalidade
            </td>
          </tr>
          <tr>
            <td>Cópias de segurança</td>
            <td>
              As <strong>8 cópias semanais mais recentes</strong> (≈ 2 meses, rotativas). Um
              registro excluído do banco pode, portanto, sobreviver em cópia de segurança por{" "}
              <strong>até cerca de 2 meses</strong> antes de desaparecer por rotação
            </td>
          </tr>
          <tr>
            <td>Prontuário odontológico (fora deste site)</td>
            <td>
              <span className={styles.fill}>
                [PREENCHER: prazo confirmado com o responsável técnico / CRO-MG; usualmente no
                mínimo 10 anos contados do último atendimento]
              </span>
            </td>
          </tr>
          <tr>
            <td>Consentimento de marketing</td>
            <td>
              Enquanto não for revogado. O pedido de revogação é registrado <strong>fora do
              banco</strong> (registro administrativo da clínica) e guardado por{" "}
              <strong>5 anos</strong>, como prova de que foi atendido
            </td>
          </tr>
          <tr>
            <td>Logs técnicos com IP (Cloudflare)</td>
            <td>
              <strong>3 dias</strong>, prazo de retenção de log da plataforma no plano utilizado
            </td>
          </tr>
          <tr>
            <td>Registros técnicos de terceiros (Google, WhatsApp — só se você usar o botão de confirmação)</td>
            <td>Pelo prazo definido por cada um desses fornecedores, fora do nosso controle</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Por que 12 meses.</strong> É o prazo em que um pedido de avaliação ainda tem
        finalidade real (retomar contato com quem demonstrou interesse dentro de um ciclo anual de
        cuidado bucal). Passado isso, manter nome, telefone e uma informação de saúde de alguém que
        nunca virou paciente contraria o princípio da <strong>necessidade</strong> (LGPD, art. 6º,
        III).
      </p>
      <p>
        <strong>Como a exclusão é feita.</strong> Manualmente, por consulta registrada no
        repositório do projeto, em duas frentes: o banco de dados e as cópias de segurança dentro
        da janela de rotação. Responsável pela rotina:{" "}
        <span className={styles.fill}>[PREENCHER: nome/cargo da pessoa responsável]</span>.
        Periodicidade recomendada: <strong>trimestral</strong>.
      </p>

      <h2>6. Seus direitos como titular (LGPD, art. 18)</h2>
      <p>Você pode, a qualquer momento e gratuitamente, solicitar:</p>
      <ol>
        <li>
          <strong>Confirmação</strong> de que tratamos dados seus;
        </li>
        <li>
          <strong>Acesso</strong> aos seus dados;
        </li>
        <li>
          <strong>Correção</strong> de dados incompletos, inexatos ou desatualizados;
        </li>
        <li>
          <strong>Anonimização, bloqueio ou eliminação</strong> de dados desnecessários, excessivos
          ou tratados em desconformidade com a lei;
        </li>
        <li>
          <strong>Portabilidade</strong> a outro fornecedor de serviço;
        </li>
        <li>
          <strong>Eliminação</strong> dos dados tratados com base no seu consentimento;
        </li>
        <li>
          <strong>Informação</strong> sobre com quem compartilhamos seus dados;
        </li>
        <li>
          <strong>Informação</strong> sobre a possibilidade de não consentir e as consequências
          disso;
        </li>
        <li>
          <strong>Revogação do consentimento</strong>, a qualquer momento e de forma gratuita.
        </li>
      </ol>
      <p>
        <strong>Como exercer:</strong> envie o pedido para clinacodonto@gmail.com,
        identificando-se. Responderemos em até <strong>15 (quinze) dias</strong> contados do
        recebimento, conforme o art. 19, II, da LGPD.
      </p>
      <p>
        <strong>Como confirmamos que é você.</strong> O formulário só coleta nome e telefone, então
        o telefone é a chave de busca. Antes de exportar ou apagar qualquer coisa, confirmamos a
        sua identidade por outro canal (por exemplo, uma ligação para o próprio número informado) —
        responder a um pedido falso seria, em si, um vazamento.
      </p>
      <p>
        <strong>Sobre a exclusão e as cópias de segurança.</strong> Ao atender um pedido de
        eliminação, removemos o registro do banco e também das cópias de segurança ainda dentro da
        janela de rotação descrita na seção 5.
      </p>
      <p>
        Você também pode apresentar reclamação diretamente à <strong>ANPD</strong> (
        <a href="https://www.gov.br/anpd" target="_blank" rel="noopener">
          gov.br/anpd
        </a>
        ).
      </p>

      <h2>7. Crianças e adolescentes (LGPD, art. 14)</h2>
      <p>
        A Clínac atende crianças (odontopediatria), e &ldquo;Odontopediatria&rdquo; é uma das
        opções do formulário. Por isso:
      </p>
      <ul>
        <li>
          <strong>O formulário deste site deve ser preenchido exclusivamente por maiores de 18
          anos.</strong> Se o agendamento é para uma criança ou adolescente, quem preenche deve ser
          o <strong>pai, a mãe ou o responsável legal</strong>, informando os próprios dados de
          contato.
        </li>
        <li>
          O tratamento de dados de <strong>crianças menores de 12 anos</strong> só é realizado
          mediante <strong>consentimento específico e em destaque dado por pelo menos um dos pais
          ou responsável legal</strong>, conforme o art. 14, § 1º, da LGPD. A aceitação genérica dos
          Termos de Uso não supre esse consentimento.
        </li>
        <li>
          Todo tratamento de dados de crianças e adolescentes é feito{" "}
          <strong>no melhor interesse do menor</strong> (art. 14, <em>caput</em>).
        </li>
        <li>
          Não condicionamos a participação em nenhuma atividade ao fornecimento de dados pessoais
          de crianças além do estritamente necessário (art. 14, § 4º).
        </li>
      </ul>
      <p>
        Se identificarmos que um formulário foi preenchido diretamente por um menor sem a
        intervenção do responsável, <strong>excluiremos os dados</strong> e retomaremos o contato
        apenas com o responsável legal.
      </p>

      <h2>8. Segurança e resposta a incidentes</h2>
      <p>
        Medidas técnicas e administrativas efetivamente adotadas, proporcionais ao porte da
        clínica:
      </p>
      <ul>
        <li>
          o banco de dados <strong>nega acesso por padrão</strong>: não existe caminho público de
          leitura ou escrita na tabela de pedidos, e a chave pública do banco não dá acesso a nada;
        </li>
        <li>
          a gravação de um pedido só acontece pelo servidor do próprio site, após validação e
          verificação anti-robô;
        </li>
        <li>
          o painel interno exige <strong>login</strong> e, além disso, que a conta esteja em uma{" "}
          <strong>lista de permissão</strong> mantida à mão pela clínica — &ldquo;estar
          logado&rdquo; não basta;
        </li>
        <li>
          a equipe do painel <strong>não pode alterar nem apagar</strong> nome, telefone,
          tratamento ou consentimento de um pedido; só pode mudar o estágio do atendimento;
        </li>
        <li>
          exclusão de dado de titular é <strong>operação manual e registrada</strong>, nunca um
          botão de um clique;
        </li>
        <li>
          o <strong>tratamento de interesse (dado de saúde) não é enviado por e-mail nem gravado em
          logs</strong>;
        </li>
        <li>
          transmissão sempre por conexão criptografada (HTTPS); cópias de segurança{" "}
          <strong>criptografadas em repouso</strong>, em bucket privado.
        </li>
      </ul>
      <p>
        Nenhum sistema é totalmente imune. <strong>Em caso de incidente de segurança que possa
        acarretar risco ou dano relevante aos titulares</strong>, adotaremos o seguinte
        procedimento:
      </p>
      <ol>
        <li>
          <strong>Quem é acionado:</strong>{" "}
          <span className={styles.fill}>[PREENCHER: nome/cargo do responsável pelo canal de privacidade]</span>,
          imediatamente ao tomar conhecimento do incidente.
        </li>
        <li>
          <strong>Prazo:</strong> comunicação à{" "}
          <strong>ANPD e aos titulares afetados em até 3 (três) dias úteis</strong> contados do
          conhecimento de que o incidente afetou dados pessoais (art. 48 da LGPD e Resolução
          CD/ANPD nº 15/2024).
        </li>
        <li>
          <strong>Como comunicamos aos titulares:</strong> contato direto por telefone/WhatsApp
          e/ou e-mail cadastrado, e, se não for possível alcançar todos, aviso destacado neste
          site.
        </li>
        <li>
          <strong>O que informamos:</strong> natureza dos dados afetados, titulares envolvidos,
          medidas técnicas de proteção utilizadas, riscos envolvidos, motivo de eventual demora e
          as medidas adotadas para reverter ou mitigar os efeitos.
        </li>
        <li>
          <strong>Registro:</strong> todo incidente é registrado internamente, mesmo quando não
          houver obrigação de comunicação.
        </li>
      </ol>

      <h2>9. Encarregado (DPO)</h2>
      <p>
        A Clínac se enquadra como <strong>agente de tratamento de pequeno porte</strong> e, nos
        termos da <strong>Resolução CD/ANPD nº 2/2022</strong>, está dispensada da indicação formal
        de Encarregado. Mantemos, contudo, o canal de comunicação exigido pela norma, para
        titulares e para a ANPD:
      </p>
      <p>
        clinacodonto@gmail.com —{" "}
        <span className={styles.fill}>[PREENCHER: nome/cargo de quem responde por esse canal na clínica]</span>
      </p>
      <p>
        <span className={styles.fill}>
          [VERIFICAR COM ADVOGADO: o regime diferenciado da Resolução nº 2/2022 não se aplica a quem
          realiza tratamento de alto risco. Este site trata dado sensível de saúde (critério
          específico), mas em volume pequeno (dezenas a poucas centenas de pedidos por mês), o que
          não caracteriza &ldquo;larga escala&rdquo;. Se o volume crescer de forma relevante, esta
          dispensa precisa ser reavaliada e um Encarregado formalmente indicado.]
        </span>
      </p>

      <h2>10. Alterações desta política e registro do consentimento</h2>
      <p>
        Podemos atualizar esta política. A data da &ldquo;Última atualização&rdquo; no topo sempre
        indicará a versão vigente. Alterações relevantes na finalidade ou nas bases legais serão
        comunicadas de forma destacada e, quando a lei exigir, mediante novo consentimento.
      </p>
      <p>
        <strong>
          Cada pedido de avaliação guarda a versão desta política que estava vigente no momento do
          envio
        </strong>{" "}
        — assim, quem consentiu com uma versão anterior continua vinculado ao texto que efetivamente
        leu, e conseguimos demonstrar isso se você ou a ANPD perguntarem (art. 8º, § 2º, da LGPD).
      </p>

      <h2>11. Publicidade odontológica</h2>
      <p>
        A <strong>Resolução CFO-196/2019</strong> restringe a publicidade odontológica e{" "}
        <strong>veda a divulgação de depoimentos de pacientes</strong>. Em 2026-08-14 o dono do
        site confirmou que a seção &ldquo;Depoimentos&rdquo; era fictícia (texto de exemplo, nunca
        foram pacientes reais) e as estatísticas do topo da página (&ldquo;12 anos&rdquo;,
        &ldquo;4.9/5 em mais de 800 avaliações&rdquo;, &ldquo;500+ implantes&rdquo;) não tinham
        fonte — a seção de depoimentos foi <strong>removida</strong> e as estatísticas foram
        trocadas por diferenciais qualitativos, sem número não verificado.
      </p>
      <div className={styles.warn}>
        <strong>Se um depoimento real de paciente for adicionado no futuro</strong>, ele precisa do
        aval do <strong>responsável técnico junto ao CRO-MG</strong> antes da publicação — a
        Resolução CFO-196/2019 restringe esse tipo de conteúdo mesmo quando genuíno e autorizado
        pelo paciente. Isso não é um ajuste de código, é uma decisão da própria clínica.
      </div>

      <h2>12. Foro</h2>
      <p>
        <span className={styles.fill}>
          [PREENCHER: comarca — usualmente a do domicílio do consumidor, nos termos do CDC.
          Confirmar com advogado.]
        </span>
      </p>
    </LegalLayout>
  );
}
