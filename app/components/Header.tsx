"use client";

import { useState } from "react";

// Migrado do bloco "1) Menu Mobile" de index.html. Original manipulava
// `links.style.cssText` direto no DOM; aqui usamos estado do React + o
// mesmo conjunto de propriedades inline para reproduzir exatamente o
// mesmo comportamento visual (dropdown absoluto abaixo do header) sem
// depender de manipulação direta de DOM em um componente React.
const OPEN_STYLE: React.CSSProperties = {
  display: "flex",
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  background: "#FBFDFC",
  flexDirection: "column",
  padding: "20px 32px",
  gap: "18px",
  borderBottom: "1px solid #D9E8DF",
};

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header>
      <nav className="wrap">
        <a href="#top" className="logo">
          <svg className="mark" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <path
              d="M13 4c-3 0-5 2-5 5.5 0 3 1.3 5.6 1.3 8.3 0 1.3.6 2.2 1.6 2.2.9 0 1.3-.7 1.6-2 .3-1.2.4-2.4 1-2.4s.7 1.2 1 2.4c.3 1.3.7 2 1.6 2 1 0 1.6-.9 1.6-2.2 0-2.7 1.3-5.3 1.3-8.3C18 6 16 4 13 4z"
              stroke="#0E3B2C"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
          Clínac
        </a>
        <ul className="nav-links" style={open ? OPEN_STYLE : undefined}>
          <li>
            <a href="#tratamentos" onClick={() => setOpen(false)}>
              Tratamentos
            </a>
          </li>
          <li>
            <a href="#implantes" onClick={() => setOpen(false)}>
              Implantes
            </a>
          </li>
          <li>
            <a href="#sobre" onClick={() => setOpen(false)}>
              Sobre
            </a>
          </li>
          <li>
            <a href="#depoimentos" onClick={() => setOpen(false)}>
              Depoimentos
            </a>
          </li>
          <li>
            <a href="#contato" onClick={() => setOpen(false)}>
              Contato
            </a>
          </li>
        </ul>
        <div className="nav-cta">
          <a href="#contato" className="btn btn-primary">
            Agendar consulta
          </a>
          <button
            type="button"
            className="menu-toggle"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            ☰
          </button>
        </div>
      </nav>
    </header>
  );
}
