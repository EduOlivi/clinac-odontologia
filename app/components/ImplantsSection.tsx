import Carousel from "./Carousel";

const CHECK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export default function ImplantsSection() {
  return (
    <section id="implantes" className="implants">
      <div className="wrap">
        <div className="reveal">
          <div className="eyebrow">Especialidade em destaque</div>
          <h2>Implantodontia: devolvemos a função e a naturalidade do seu sorriso.</h2>
          <p className="hero-sub" style={{ marginTop: "16px" }}>
            Da reposição de um único dente ao protocolo completo sobre implantes, cada caso é
            planejado em imagem 3D antes do primeiro corte — para você saber exatamente o que
            esperar.
          </p>

          <div className="implant-list">
            <div className="implant-item">
              {CHECK_ICON}
              <div>
                <h4>Planejamento 3D guiado</h4>
                <p>Tomografia computadorizada define o ponto exato do implante antes da cirurgia.</p>
              </div>
            </div>
            <div className="implant-item">
              {CHECK_ICON}
              <div>
                <h4>Cirurgia minimamente invasiva</h4>
                <p>Técnicas guiadas reduzem tempo de cirurgia, inchaço e recuperação.</p>
              </div>
            </div>
            <div className="implant-item">
              {CHECK_ICON}
              <div>
                <h4>Do implante único ao protocolo total</h4>
                <p>Atendemos desde a perda de um dente até reabilitação completa (all-on-4/6).</p>
              </div>
            </div>
          </div>

          <a href="#contato" className="btn btn-primary" style={{ marginTop: "32px" }}>
            Agendar avaliação para implante
          </a>
        </div>

        {/*
          implante-antes-depois.jpg: pedido explícito do dono do site em 2026-08-18
          (imagem autorizada e fornecida pela própria clínica) — mostra os dois
          painéis (antes: parafusos de implante visíveis; depois: sorriso
          reabilitado), gerados a partir do arquivo original foto 2.jpeg (histórico
          do repo, commit 68de4d1) recortando só a marca d'água "Clinac Odontologia"
          que ficava sobreposta entre os dois painéis — nenhum conteúdo de dente/gengiva
          foi alterado ou reconstruído, só removida a faixa onde a marca d'água estava.

          ATENÇÃO — imagem de antes/depois: a Resolução CFO-196/2019 tem leituras que
          restringem esse tipo de comparação em publicidade odontológica, além da
          restrição já conhecida sobre depoimentos de paciente (ver PRIVACIDADE.md §11).
          Decisão de publicar tomada explicitamente pelo dono do site com autorização
          da clínica — mesma régua já aplicada ao depoimento removido anteriormente:
          não é um ajuste de código, é decisão da própria clínica, registrada aqui.

          <img> simples (não next/image): a foto é servida estaticamente de
          public/imagens e o deploy alvo é Cloudflare Workers, cuja otimização
          de imagem via next/image exige configuração própria (loader customizado
          ou Cloudflare Images) que ainda não foi decidida por devops. Trocar
          para next/image é seguro de revisitar depois, sem mudança visual.
        */}
        <div className="reveal">
          <Carousel
            slides={[
              {
                src: "/imagens/implante-antes-depois.jpg",
                alt: "Antes e depois de reabilitação com implante: acima, dentes ausentes com parafusos de implante visíveis; abaixo, sorriso reabilitado",
              },
            ]}
            caption="Antes e depois: caso real de reabilitação com implante"
          />
        </div>
      </div>
    </section>
  );
}
