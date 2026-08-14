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
          Fotos originais (foto 1..4.jpeg) são colagens verticais com 2-3 painéis
          separados por uma marca d'água — não utilizáveis direto no carrossel.
          implante-01.jpg é um recorte (painel único, proporção 4:5) gerado a partir
          de foto 2.jpeg (painel inferior). implante-02.jpg (foto 1.jpeg, painel
          superior) foi removido daqui: é um caso de tratamento ortodôntico (aparelho),
          não de implante — não representa o que esta seção anuncia, então não deve
          aparecer com legenda de "caso de implante" mesmo com uso de imagem autorizado
          pela clínica. foto 3/4.jpeg foram descartadas: todos os painéis são macro
          clínico extremo, sem recorte aproveitável para marketing.

          <img> simples (não next/image): a foto é servida estaticamente de
          public/imagens e o deploy alvo é Cloudflare Workers, cuja otimização
          de imagem via next/image exige configuração própria (loader customizado
          ou Cloudflare Images) que ainda não foi decidida por devops. Trocar
          para next/image é seguro de revisitar depois, sem mudança visual.
        */}
        <div className="reveal">
          <Carousel
            slides={[{ src: "/imagens/implante-01.jpg", alt: "Sorriso reabilitado com implante, sem metal aparente" }]}
            caption="Caso real de reabilitação com implante"
          />
        </div>
      </div>
    </section>
  );
}
