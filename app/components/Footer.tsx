import Link from "next/link";

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <div className="foot-logo">
              <svg viewBox="0 0 26 26" fill="none" aria-hidden="true">
                <path
                  d="M13 4c-3 0-5 2-5 5.5 0 3 1.3 5.6 1.3 8.3 0 1.3.6 2.2 1.6 2.2.9 0 1.3-.7 1.6-2 .3-1.2.4-2.4 1-2.4s.7 1.2 1 2.4c.3 1.3.7 2 1.6 2 1 0 1.6-.9 1.6-2.2 0-2.7 1.3-5.3 1.3-8.3C18 6 16 4 13 4z"
                  stroke="#9FC4AE"
                  strokeWidth="1.4"
                />
              </svg>
              Clínac
            </div>
            <p className="foot-desc">
              Odontologia geral e especializada em Belo Horizonte. Cuidado explicado em cada
              etapa, do diagnóstico ao pós-tratamento.
            </p>
          </div>
          <div className="foot-col">
            <h5>Clínica</h5>
            <ul>
              <li>
                <a href="#tratamentos">Tratamentos</a>
              </li>
              <li>
                <a href="#sobre">Sobre nós</a>
              </li>
              <li>
                <Link href="/privacidade">Política de Privacidade</Link>
              </li>
              <li>
                <Link href="/termos">Termos de Uso</Link>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <h5>Contato</h5>
            <ul className="foot-contact">
              <li>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.8 21 3 13.2 3 3.9c0-.6.4-1 1-1h3.3c.6 0 1 .4 1 1 0 1.2.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8z" />
                </svg>
                (31) 98618-2875
              </li>
              <li>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M4 6.5l8 6 8-6" />
                </svg>
                clinacodonto@gmail.com
              </li>
              <li>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 22s7-6.6 7-12a7 7 0 0 0-14 0c0 5.4 7 12 7 12z" />
                  <circle cx="12" cy="10" r="2.3" />
                </svg>
                Rua Desembargador Ribeiro da Luz, 462 — Barreiro, Belo Horizonte/MG, 30640-040
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <h5>Horários</h5>
            <ul>
              <li>Segunda a quinta · 8h às 18h</li>
              <li>Sexta · 8h às 15h</li>
              <li>Sábado e domingo · Fechado</li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 Clínac Odontologia. Todos os direitos reservados.</span>
          <span>Resp. téc. Simone Oliveira — CRO-MG 49483 · EPAO 4909</span>
        </div>
      </div>
    </footer>
  );
}
