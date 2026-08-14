const TOOTH_PATH =
  "M100 20c-22 0-38 16-38 42 0 24 10 44 10 66 0 10 5 17 13 17s11-6 13-16c2-9 3-18 8-18s6 9 8 18c2 10 5 16 13 16s13-7 13-17c0-22 10-42 10-66 0-26-16-42-38-42z";

export default function About() {
  return (
    <section id="sobre" className="about">
      <div className="wrap">
        <div className="reveal">
          <div className="eyebrow">Sobre a Clínac</div>
          <h2>
            Uma clínica pensada para tirar <em>o medo</em> da cadeira do dentista.
          </h2>
          <div className="diff-list">
            <div className="diff-item">
              <span className="diff-num">01</span>
              <div>
                <h4>Diagnóstico antes de qualquer procedimento</h4>
                <p>
                  Toda avaliação começa com escaneamento digital — você vê a imagem da sua própria
                  arcada antes de decidir o tratamento.
                </p>
              </div>
            </div>
            <div className="diff-item">
              <span className="diff-num">02</span>
              <div>
                <h4>Equipe multidisciplinar sob o mesmo teto</h4>
                <p>
                  Ortodontista, implantodontista e odontopediatra dividem o mesmo prontuário, sem
                  reencaminhamentos.
                </p>
              </div>
            </div>
            <div className="diff-item">
              <span className="diff-num">03</span>
              <div>
                <h4>Ambiente pensado para todas as idades</h4>
                <p>Salas separadas para atendimento infantil, com linguagem e ritmo adaptados a cada fase.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="about-visual reveal">
          {/* 2 cópias extras do MESMO traço de dente do ícone principal (não é um
              asset novo), maiores e giradas, atrás da ilustração central, só para
              preencher o painel — puramente decorativo, por isso aria-hidden. */}
          <svg className="tooth-bg tooth-bg-1" viewBox="0 0 200 250" fill="none" aria-hidden="true" focusable="false">
            <path d={TOOTH_PATH} stroke="#FFFFFF" strokeWidth="1.6" />
          </svg>
          <svg className="tooth-bg tooth-bg-2" viewBox="0 0 200 250" fill="none" aria-hidden="true" focusable="false">
            <path d={TOOTH_PATH} stroke="#9FC4AE" strokeWidth="1.6" />
          </svg>
          <svg className="tooth-main" viewBox="0 0 200 250" fill="none" aria-hidden="true" focusable="false">
            <path d={TOOTH_PATH} stroke="#9FC4AE" strokeWidth="1.6" opacity=".8" />
            <path
              d="M100 45c-14 0-22 10-22 26 0 15 6 27 6 41 0 6 3 10 8 10s7-4 8-10c1-6 2-11 5-11s4 5 5 11c1 6 3 10 8 10s8-4 8-10c0-14 6-26 6-41 0-16-8-26-22-26z"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              opacity=".5"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
