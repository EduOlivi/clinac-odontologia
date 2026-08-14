"use client";

import { useEffect } from "react";

/**
 * Migrado do bloco "2) Scroll Reveal" de index.html. Observa todo elemento
 * com a classe `.reveal` já presente no DOM (renderizado no servidor) e
 * adiciona `.in` quando ele entra na viewport, disparando a transição
 * definida em globals.css. Sob prefers-reduced-motion, o CSS já força
 * opacity:1/transform:none independente desta classe (ver globals.css),
 * então este observer continua rodando sem efeito visual adicional —
 * mesmo comportamento do script original.
 */
export default function RevealObserver() {
  useEffect(() => {
    const revealEls = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    revealEls.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, []);

  return null;
}
