type Testimonial = {
  quote: string;
  initials: string;
  name: string;
  role: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Levei meu filho de 5 anos com receio e a equipe transformou a consulta em uma coisa tranquila. Ele já pergunta quando volta.",
    initials: "MP",
    name: "Marina P.",
    role: "Odontopediatria",
  },
  {
    quote:
      "Fiz o alinhador invisível e acompanhei cada etapa pelo escaneamento. Sabia exatamente o que esperar em cada retorno.",
    initials: "RC",
    name: "Rafael C.",
    role: "Ortodontia",
  },
  {
    quote: "Implante planejado com calma, sem pressa para fechar orçamento. Resultado ficou natural, ninguém percebe.",
    initials: "LS",
    name: "Luiza S.",
    role: "Implantodontia",
  },
];

export default function Testimonials() {
  return (
    // ATENÇÃO (compliance): a Resolução CFO-196/2019 restringe/veda a divulgação
    // de depoimentos de pacientes em publicidade odontológica. Estes depoimentos
    // e as estatísticas do hero são de exemplo. O dono do site deve avaliar esta
    // seção com o responsável técnico/CRO-MG antes da publicação definitiva. Não
    // removemos a seção — decisão do dono do site (mesma nota do index.html original).
    <section id="depoimentos" className="testimonials">
      <div className="wrap">
        <div className="section-head reveal">
          <div className="eyebrow">Depoimentos</div>
          <h2>O que fica depois da consulta</h2>
        </div>

        <div className="test-grid reveal">
          {TESTIMONIALS.map((t) => (
            <div className="test-card" key={t.name}>
              <div className="stars">★★★★★</div>
              <p className="test-quote">{t.quote}</p>
              <div className="test-foot">
                <div className="test-avatar">{t.initials}</div>
                <div>
                  <div className="test-name">{t.name}</div>
                  <div className="test-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
