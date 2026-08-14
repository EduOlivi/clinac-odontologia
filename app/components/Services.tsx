type Service = {
  fdi: string;
  title: string;
  description: string;
  featured?: boolean;
  icon: React.ReactNode;
};

const SERVICES: Service[] = [
  {
    fdi: "boca toda",
    title: "Limpeza & Prevenção",
    description:
      "Remoção de tártaro, aplicação de flúor e orientação de higiene para manter a arcada inteira saudável.",
    icon: (
      <svg className="service-tooth" viewBox="0 0 30 30" fill="none" aria-hidden="true">
        <path
          d="M15 5c-3.5 0-6 2.3-6 6.3 0 3.4 1.5 6.4 1.5 9.5 0 1.5.7 2.5 1.9 2.5s1.5-.8 1.9-2.3c.3-1.4.5-2.7 1.2-2.7s.9 1.3 1.2 2.7c.4 1.5.7 2.3 1.9 2.3s1.9-1 1.9-2.5c0-3.1 1.5-6.1 1.5-9.5C21 7.3 18.5 5 15 5z"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path d="M6.5 6V9M5 7.5H8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M23.5 9V12M22 10.5H25" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    fdi: "1 dente ao sorriso completo",
    title: "Implantodontia",
    description:
      "De um único dente ao protocolo total (all-on-4/6), com cirurgia guiada por planejamento 3D e acompanhamento até a entrega da coroa final.",
    featured: true,
    icon: (
      <svg className="service-tooth" viewBox="0 0 30 30" fill="none" aria-hidden="true">
        <path
          d="M15 5c-3.5 0-6 2.3-6 6.3 0 3.4 1.5 6.4 1.5 9.5 0 1.5.7 2.5 1.9 2.5s1.5-.8 1.9-2.3c.3-1.4.5-2.7 1.2-2.7s.9 1.3 1.2 2.7c.4 1.5.7 2.3 1.9 2.3s1.9-1 1.9-2.5c0-3.1 1.5-6.1 1.5-9.5C21 7.3 18.5 5 15 5z"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path d="M15 21.3V27.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M12.6 23.2h4.8M12.8 25h4.4M13 26.8h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    fdi: "dentes do sorriso",
    title: "Clareamento Dental",
    description: "Protocolo a laser ou moldeira caseira, focado nos dentes que aparecem no sorriso.",
    icon: (
      <svg className="service-tooth" viewBox="0 0 30 30" fill="none" aria-hidden="true">
        <path
          d="M15 5c-3.5 0-6 2.3-6 6.3 0 3.4 1.5 6.4 1.5 9.5 0 1.5.7 2.5 1.9 2.5s1.5-.8 1.9-2.3c.3-1.4.5-2.7 1.2-2.7s.9 1.3 1.2 2.7c.4 1.5.7 2.3 1.9 2.3s1.9-1 1.9-2.5c0-3.1 1.5-6.1 1.5-9.5C21 7.3 18.5 5 15 5z"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M15 1.2V3.4M9.8 2.6l1 1.9M20.2 2.6l-1 1.9M6.5 6.2l1.6 1.3M23.5 6.2l-1.6 1.3"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    fdi: "arcada completa",
    title: "Ortodontia",
    description: "Aparelho fixo ou alinhadores transparentes, com acompanhamento mensal do movimento dos dentes.",
    icon: (
      <svg className="service-tooth" viewBox="0 0 30 30" fill="none" aria-hidden="true">
        <path
          d="M15 5c-3.5 0-6 2.3-6 6.3 0 3.4 1.5 6.4 1.5 9.5 0 1.5.7 2.5 1.9 2.5s1.5-.8 1.9-2.3c.3-1.4.5-2.7 1.2-2.7s.9 1.3 1.2 2.7c.4 1.5.7 2.3 1.9 2.3s1.9-1 1.9-2.5c0-3.1 1.5-6.1 1.5-9.5C21 7.3 18.5 5 15 5z"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path d="M6.5 15.5c3-1.3 14-1.3 17 0" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        <rect x="7.6" y="14.3" width="2.1" height="2.1" rx=".3" stroke="currentColor" strokeWidth="1" />
        <rect x="20.3" y="14.3" width="2.1" height="2.1" rx=".3" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    fdi: "dentes de leite",
    title: "Odontopediatria",
    description: "Consultas lúdicas para os pequenos, pensadas para criar uma relação tranquila com o dentista.",
    icon: (
      <svg className="service-tooth" viewBox="0 0 30 30" fill="none" aria-hidden="true">
        <path
          d="M15 8c-4.5 0-7.5 3-7.5 7.3 0 3 1.1 5.4 1.1 7.7 0 1.3.6 2 1.6 2 .9 0 1.3-.7 1.5-1.7.2-.9.4-1.7 1-1.7s.8.8 1 1.7c.2 1 .6 1.7 1.5 1.7s1.5-.8 1.5-1.7c0-.9.2-1.7.8-1.7s.6.8.8 1.7c.2 1 .6 1.7 1.5 1.7s1.6-.7 1.6-2c0-2.3 1.1-4.7 1.1-7.7C22.6 11 19.5 8 15 8z"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path d="M12 14.5c.6.7 1.4 1 3 1s2.4-.3 3-1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    fdi: "faceta · lente",
    title: "Lentes de Contato Dental",
    description: "Facetas ultrafinas de porcelana para uniformizar cor e formato sem desgastar o dente.",
    icon: (
      <svg className="service-tooth" viewBox="0 0 30 30" fill="none" aria-hidden="true">
        <path
          d="M15 5c-3.5 0-6 2.3-6 6.3 0 3.4 1.5 6.4 1.5 9.5 0 1.5.7 2.5 1.9 2.5s1.5-.8 1.9-2.3c.3-1.4.5-2.7 1.2-2.7s.9 1.3 1.2 2.7c.4 1.5.7 2.3 1.9 2.3s1.9-1 1.9-2.5c0-3.1 1.5-6.1 1.5-9.5C21 7.3 18.5 5 15 5z"
          stroke="currentColor"
          strokeWidth="1.3"
          opacity=".5"
        />
        <path
          d="M15 5c-3.5 0-6 2.3-6 6.3 0 3.4 1.5 6.4 1.5 9.5 0 1.5.7 2.5 1.9 2.5s1.5-.8 1.9-2.3c.3-1.4.5-2.7 1.2-2.7s.9 1.3 1.2 2.7c.4 1.5.7 2.3 1.9 2.3s1.9-1 1.9-2.5c0-3.1 1.5-6.1 1.5-9.5C21 7.3 18.5 5 15 5z"
          stroke="currentColor"
          strokeWidth="1.1"
          transform="translate(2.4,-1.6)"
        />
      </svg>
    ),
  },
];

export default function Services() {
  return (
    <section id="tratamentos">
      <div className="wrap">
        <div className="section-head reveal">
          <div className="eyebrow">Tratamentos</div>
          <h2>Cada dente tem sua história. Nós cuidamos de todas elas.</h2>
          <p>
            Da prevenção de rotina aos casos mais delicados, veja rapidinho onde cada tratamento
            atua e para quem ele é indicado.
          </p>
        </div>

        <div className="services-grid reveal">
          {SERVICES.map((service) => (
            <div className={`service-card${service.featured ? " featured" : ""}`} key={service.title}>
              {service.featured && <span className="service-badge">Mais procurado</span>}
              <span className="service-fdi">{service.fdi}</span>
              {service.icon}
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
