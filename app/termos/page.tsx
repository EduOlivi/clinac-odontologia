import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "../components/legal/LegalLayout";
import styles from "../components/legal/legal.module.css";
import { SITE_NAME } from "../lib/site-config";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Termos de Uso do site da Clínac Odontologia: regras de uso do site, do formulário de agendamento e limitações de responsabilidade.",
  alternates: { canonical: "/termos" },
  openGraph: {
    type: "website",
    title: `Termos de Uso — ${SITE_NAME}`,
    description: "Regras de uso do site institucional da Clínac Odontologia e do formulário de agendamento.",
    url: "/termos",
  },
};

/* ==========================================================================
   ESTA PÁGINA É UMA CÓPIA RENDERIZADA DE ../../TERMOS.md
   ==========================================================================
   As duas precisam dizer EXATAMENTE a mesma coisa. Se você mudar o conteúdo
   jurídico aqui, mude no .md no mesmo commit — e vice-versa.
   ========================================================================== */
export default function TermosPage() {
  return (
    <LegalLayout
      title="Termos de Uso"
      lastUpdated="Última atualização: 14 de agosto de 2026 · Versão 2.0 (minuta — pendente de revisão jurídica)"
      warning={
        <>
          <strong>⚠️ AVISO — ESTE DOCUMENTO AINDA NÃO FOI REVISADO POR ADVOGADO.</strong>
          <br />
          <br />
          Esta é uma minuta. Cláusulas de limitação de responsabilidade em relação de consumo são
          interpretadas restritivamente pelo Código de Defesa do Consumidor, e a redação abaixo{" "}
          <strong>não garante</strong>, por si só, proteção contra responsabilização. Não publique
          como versão final sem revisão de um advogado. Antes de publicar, remova este aviso{" "}
          <strong>e</strong> preencha todos os campos em <span className={styles.fill}>destaque</span>.
        </>
      }
      docNav={
        <>
          <Link href="/privacidade">Ver Política de Privacidade →</Link>
          <Link href="/">← Voltar à página inicial</Link>
        </>
      }
      footerSecondaryLink={<Link href="/privacidade">Política de Privacidade</Link>}
    >
      <div className={styles.warn}>
        <strong>O que mudou da v1.0 para a v2.0.</strong> A infraestrutura do site foi refeita: ele
        deixou de ser um site estático hospedado no GitHub Pages com formulário enviado à
        Formspree, e passou a rodar em Cloudflare Workers com banco de dados próprio. As cláusulas
        5.1, 5.2, 5.3, 9 e 10 foram atualizadas por causa disso.
      </div>

      <h2>1. Sobre estes Termos</h2>
      <p>
        Estes Termos de Uso regulam o acesso e a utilização do site institucional da Clínac
        Odontologia. Ao navegar no site ou utilizar o formulário de agendamento, você declara que
        leu e concorda com estes Termos.
      </p>
      <p>
        Estes Termos tratam das <strong>regras de uso do site</strong>. O tratamento dos seus
        dados pessoais é descrito em documento separado, a{" "}
        <Link href="/privacidade">Política de Privacidade</Link>, que é parte integrante destes
        Termos.
      </p>
      <p>
        <strong>Estes Termos não regulam a prestação de serviços odontológicos.</strong> O
        atendimento clínico é objeto de contrato, plano de tratamento e termo de consentimento
        próprios, firmados presencialmente na clínica.
      </p>

      <h2>2. Identificação do prestador</h2>
      <table>
        <tbody>
          <tr>
            <th>Item</th>
            <th>Informação</th>
          </tr>
          <tr>
            <td>Razão social</td>
            <td>
              <span className={styles.fill}>[PREENCHER: razão social completa]</span>
            </td>
          </tr>
          <tr>
            <td>Nome fantasia</td>
            <td>Clínac Odontologia</td>
          </tr>
          <tr>
            <td>CNPJ</td>
            <td>
              <span className={styles.fill}>[PREENCHER: CNPJ]</span>
            </td>
          </tr>
          <tr>
            <td>Endereço</td>
            <td>
              <span className={styles.fill}>[PREENCHER: endereço completo com CEP]</span>
            </td>
          </tr>
          <tr>
            <td>Registro da pessoa jurídica no CRO-MG</td>
            <td>
              <span className={styles.fill}>[PREENCHER: nº de inscrição da clínica]</span>
            </td>
          </tr>
          <tr>
            <td>Responsável Técnico</td>
            <td>
              <span className={styles.fill}>[PREENCHER: nome do cirurgião-dentista responsável técnico]</span>
            </td>
          </tr>
          <tr>
            <td>CRO do Responsável Técnico</td>
            <td>
              <span className={styles.fill}>[PREENCHER: CRO-MG nº]</span>
            </td>
          </tr>
          <tr>
            <td>E-mail de contato</td>
            <td>
              <span className={styles.fill}>[PREENCHER]</span>
            </td>
          </tr>
          <tr>
            <td>Telefone</td>
            <td>
              <span className={styles.fill}>[PREENCHER]</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Obrigatório, não decorativo.</strong> A Resolução CFO-196/2019 exige a
        identificação do cirurgião-dentista e do respectivo número de inscrição no CRO em material
        de divulgação. O rodapé do site hoje exibe <code>CRO-MG 00000</code>, que é um valor de
        exemplo — precisa ser substituído pelo número real antes da publicação.
      </p>

      <h2>3. Finalidade do site</h2>
      <p>
        Este site tem finalidade <strong>exclusivamente informativa e de contato</strong>. Ele
        serve para apresentar a clínica e seus tratamentos e para permitir que você{" "}
        <strong>solicite</strong> uma avaliação.
      </p>

      <h2>4. O conteúdo do site não é orientação clínica</h2>
      <p>As descrições de tratamentos publicadas aqui são informação geral. Elas:</p>
      <ul>
        <li>
          <strong>não constituem diagnóstico, prescrição ou plano de tratamento;</strong>
        </li>
        <li>
          <strong>não substituem a consulta presencial</strong> com um cirurgião-dentista;
        </li>
        <li>não permitem prever resultado, duração ou preço do seu caso específico.</li>
      </ul>
      <p>
        Resultados de tratamentos odontológicos <strong>variam de pessoa para pessoa</strong> e
        dependem de avaliação clínica individual, das condições de saúde do paciente e da adesão
        às orientações profissionais. Nenhuma informação deste site deve ser lida como promessa ou
        garantia de resultado.
      </p>
      <p>
        <strong>
          Em caso de dor intensa, trauma, sangramento persistente, inchaço com febre ou qualquer
          emergência, procure atendimento presencial imediato. Este site e o formulário de
          agendamento não são canais de urgência e não são monitorados em tempo integral.
        </strong>
      </p>

      <h2>5. Formulário de agendamento</h2>
      <h3>5.1 É uma solicitação, não uma reserva</h3>
      <p>
        O envio do formulário é uma <strong>solicitação de contato</strong>. Ele <strong>não</strong>{" "}
        reserva horário, <strong>não</strong> confirma consulta e <strong>não</strong> cria vínculo
        de atendimento. Sua consulta só está agendada após confirmação expressa da Clínac por
        telefone, WhatsApp ou e-mail.
      </p>
      <p>
        Prazo estimado de retorno:{" "}
        <span className={styles.fill}>[PREENCHER: ex. até 2 dias úteis]</span>. Esse prazo é uma
        estimativa, não uma garantia contratual.
      </p>
      <p>
        O formulário depende de uma <strong>verificação anti-robô</strong> executada no seu
        navegador. Se ela não puder ser concluída (bloqueador de scripts, rede instável,
        indisponibilidade do serviço de verificação), o envio é recusado por segurança e o site
        indica o <strong>WhatsApp</strong> como canal alternativo — que continua funcionando
        independentemente do formulário.
      </p>

      <h3>5.2 Suas responsabilidades ao usar o formulário</h3>
      <p>Ao enviar o formulário, você se compromete a:</p>
      <ul>
        <li>
          fornecer informações <strong>verdadeiras e atuais</strong>, especialmente o telefone de
          contato;
        </li>
        <li>
          ter <strong>18 anos ou mais</strong>. Se a avaliação é para criança ou adolescente, o
          formulário deve ser preenchido pelo <strong>pai, mãe ou responsável legal</strong>;
        </li>
        <li>
          utilizar dados de contato <strong>próprios</strong> ou de quem você legalmente
          representa — é vedado inserir dados de terceiros sem autorização;
        </li>
        <li>
          <strong>não incluir informações clínicas sensíveis</strong> nos campos livres (CPF,
          número de convênio, diagnósticos, histórico médico, laudos ou imagens). Esses dados são
          tratados presencialmente, no ambiente adequado;
        </li>
        <li>
          não utilizar o formulário para spam, publicidade, testes automatizados ou qualquer
          finalidade diversa do agendamento;
        </li>
        <li>
          não tentar contornar a verificação anti-robô, os limites de envio ou qualquer outro
          controle de segurança do site.
        </li>
      </ul>
      <p>A Clínac pode desconsiderar e excluir solicitações manifestamente falsas, abusivas ou automatizadas.</p>

      <h3>5.3 Consentimento</h3>
      <p>
        O envio do formulário depende da marcação da caixa de consentimento nele apresentada, que
        abrange o tratamento de dado de saúde (&ldquo;tratamento de interesse&rdquo;) e a
        transferência internacional dos dados para os serviços de tecnologia usados pelo site,
        conforme a seção 4 da <Link href="/privacidade">Política de Privacidade</Link>.
      </p>
      <p>
        Essa marcação é verificada <strong>no servidor</strong>, não apenas no navegador: sem ela,
        o pedido não é gravado. O registro do seu pedido guarda <strong>qual versão da Política de
        Privacidade estava vigente</strong> no momento do envio.
      </p>
      <p>
        A caixa de <strong>comunicações promocionais é opcional e independente</strong>: recusá-la
        não impede o agendamento, e você pode revogá-la depois sem prejuízo ao seu atendimento.
      </p>

      <h2>6. Contato por WhatsApp</h2>
      <p>
        Os botões de WhatsApp direcionam para aplicativo de terceiro (Meta Platforms, Inc.). O uso
        desse canal está sujeito aos termos e à política de privacidade do WhatsApp, sobre os
        quais a Clínac não tem controle. O WhatsApp da clínica também <strong>não é canal de
        urgência</strong>.
      </p>

      <h2>7. Propriedade intelectual</h2>
      <p>
        A marca &ldquo;Clínac&rdquo;, o logotipo, os textos, as imagens, as fotografias da clínica
        e o código-fonte deste site são de titularidade da Clínac ou de seus licenciadores,
        protegidos pela Lei nº 9.610/1998 e pela Lei nº 9.279/1996.
      </p>
      <p>
        É permitido acessar e compartilhar links do site. É vedado, sem autorização prévia por
        escrito: reproduzir, copiar, modificar, distribuir ou usar comercialmente qualquer
        conteúdo, bem como extrair dados de forma automatizada (<em>scraping</em>).
      </p>
      <p>As fontes tipográficas e bibliotecas de terceiros utilizadas permanecem sujeitas às suas próprias licenças.</p>

      <h2>8. Depoimentos e conteúdo de pacientes</h2>
      <p>
        <span className={styles.fill}>[PREENCHER — PENDÊNCIA REGULATÓRIA, ver observação abaixo]</span>
      </p>
      <div className={styles.warn}>
        <strong>Atenção.</strong> A Resolução CFO-196/2019 <strong>veda a divulgação de depoimentos
        de pacientes</strong> em publicidade odontológica. A seção &ldquo;Depoimentos&rdquo;
        atualmente publicada no site precisa ser avaliada pelo responsável técnico junto ao
        CRO-MG antes da publicação definitiva. Esta cláusula só faz sentido se a seção for mantida
        em formato admitido pela norma.
      </div>

      <h2>9. Disponibilidade do site</h2>
      <p>
        O site é executado na infraestrutura da <strong>Cloudflare</strong> e utiliza serviços de
        terceiros para armazenamento (Supabase), verificação anti-robô (Cloudflare Turnstile) e
        envio de avisos por e-mail (Resend) — todos identificados na seção 4 da{" "}
        <Link href="/privacidade">Política de Privacidade</Link>. A Clínac não garante
        disponibilidade ininterrupta, ausência de erros ou acesso livre de falhas, e pode alterar,
        suspender ou descontinuar o site ou qualquer de suas seções a qualquer tempo, sem aviso
        prévio.
      </p>
      <p>
        Indisponibilidade do site <strong>não afeta</strong> consultas já confirmadas. Em caso de
        dúvida sobre um agendamento, ligue para <span className={styles.fill}>[PREENCHER: telefone]</span>.
      </p>

      <h2>10. Limitação de responsabilidade</h2>
      <p>
        Nos limites permitidos pela legislação aplicável — em especial o Código de Defesa do
        Consumidor, cujas normas de ordem pública prevalecem sobre estes Termos —, a Clínac não se
        responsabiliza por:
      </p>
      <ul>
        <li>decisões tomadas exclusivamente com base no conteúdo informativo do site, sem consulta presencial;</li>
        <li>
          indisponibilidade, lentidão ou falha de serviços de terceiros (hospedagem e verificação
          anti-robô, banco de dados, envio de e-mail, WhatsApp, provedores de e-mail);
        </li>
        <li>
          perda de solicitação de agendamento decorrente de falha técnica de terceiros ou de
          dados de contato incorretos informados pelo usuário;
        </li>
        <li>conteúdo de sites de terceiros acessados a partir de links deste site.</li>
      </ul>
      <p>
        Nada nestes Termos exclui ou limita a responsabilidade da Clínac pela{" "}
        <strong>prestação dos serviços odontológicos</strong>, que segue o regime legal e ético
        próprio.
      </p>

      <h2>11. Alterações destes Termos</h2>
      <p>
        Estes Termos podem ser alterados a qualquer momento. A versão vigente é sempre a publicada
        nesta página, identificada pela data de &ldquo;Última atualização&rdquo;. O uso continuado
        do site após a alteração implica concordância com a nova versão.
      </p>

      <h2>12. Legislação aplicável e foro</h2>
      <p>
        Estes Termos são regidos pelas leis da República Federativa do Brasil, incluindo a Lei nº
        13.709/2018 (LGPD), a Lei nº 12.965/2014 (Marco Civil da Internet) e a Lei nº 8.078/1990
        (Código de Defesa do Consumidor).
      </p>
      <p>
        Foro:{" "}
        <span className={styles.fill}>
          [PREENCHER: comarca. Em relação de consumo, o foro do domicílio do consumidor tende a
          prevalecer independentemente de eleição em contrário. Confirmar redação com advogado.]
        </span>
      </p>

      <h2>13. Contato</h2>
      <p>
        Dúvidas sobre estes Termos: <span className={styles.fill}>[PREENCHER: e-mail]</span>
        <br />
        Assuntos de privacidade e dados pessoais:{" "}
        <span className={styles.fill}>[PREENCHER: e-mail de privacidade]</span>
      </p>
    </LegalLayout>
  );
}
