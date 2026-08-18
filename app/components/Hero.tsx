export default function Hero() {
  return (
    <section className="hero" style={{ paddingTop: "88px" }}>
      <div className="wrap">
        <div>
          <div className="eyebrow">Odontologia em Belo Horizonte</div>
          <h1>
            Um sorriso bem cuidado <em>se nota</em> antes de ser mostrado.
          </h1>
          <p className="hero-sub">
            Da limpeza de rotina aos tratamentos mais delicados, a Clínac acompanha a saúde bucal
            da sua família com planejamento claro, tecnologia digital e uma equipe que explica
            cada etapa antes de agir.
          </p>
          <div className="hero-actions">
            <a href="#contato" className="btn btn-primary">
              Agendar avaliação
            </a>
            <a href="#tratamentos" className="btn btn-outline">
              Ver tratamentos
            </a>
          </div>
          {/* Trocado em 2026-08-14: os números originais ("12 anos", "4.9/5 em
              800+ avaliações", "500+ implantes") eram de exemplo — o dono do
              site confirmou que não são reais. Em vez de suavizar pra um
              número genérico igualmente inventado, viraram diferenciais
              qualitativos (o mesmo conteúdo já usado como base da seção
              "Sobre") — nada aqui afirma uma quantidade não verificada. */}
          <div className="hero-stats">
            <div>
              <div className="stat-num">Digital</div>
              <div className="stat-label">
                escaneamento intraoral,
                <br />
                sem moldes de massa
              </div>
            </div>
            <div>
              <div className="stat-num">Por escrito</div>
              <div className="stat-label">
                plano de tratamento claro
                <br />
                antes de começar
              </div>
            </div>
            <div>
              <div className="stat-num">Explicado</div>
              <div className="stat-label">
                cada etapa, do diagnóstico
                <br />
                ao pós-tratamento
              </div>
            </div>
          </div>
        </div>

        <div className="hero-art">
          {/* viewBox recortado para o bounding box real do traço (antes 0 0 420
              440, com o conteúdo ocupando só ~60% da área) — preenche mais a
              coluna sem alterar nenhum path/animação. */}
          <svg viewBox="40 45 330 335" fill="none" aria-hidden="true">
            <path className="smile-path" d="M60 160 Q210 340 360 160" />
            <path
              className="smile-path accent"
              style={{ animationDelay: ".6s" }}
              d="M95 175 Q210 300 325 175"
            />
            <g stroke="#0E3B2C" strokeWidth="1.4" strokeLinecap="round">
              <path className="art-dot" style={{ animationDelay: "1.9s" }} d="M115 190 L112 210" />
              <path className="art-dot" style={{ animationDelay: "2s" }} d="M150 218 L148 240" />
              <path className="art-dot" style={{ animationDelay: "2.1s" }} d="M190 236 L189 259" />
              <path className="art-dot" style={{ animationDelay: "2.2s" }} d="M230 236 L231 259" />
              <path className="art-dot" style={{ animationDelay: "2.3s" }} d="M270 218 L272 240" />
              <path className="art-dot" style={{ animationDelay: "2.4s" }} d="M305 190 L308 210" />
            </g>
            <circle className="art-dot" style={{ animationDelay: "2.6s" }} cx="70" cy="90" r="3" fill="#9FC4AE" />
            <circle className="art-dot" style={{ animationDelay: "2.8s" }} cx="350" cy="100" r="4" fill="#1F7A53" />
            <circle className="art-dot" style={{ animationDelay: "3s" }} cx="345" cy="330" r="3" fill="#9FC4AE" />
            <circle className="art-dot" style={{ animationDelay: "3.1s" }} cx="60" cy="310" r="4" fill="#1F7A53" />
          </svg>
        </div>
      </div>
    </section>
  );
}
