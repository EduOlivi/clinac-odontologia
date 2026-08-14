"use client";

import { useEffect, useRef, useState } from "react";

export type CarouselSlide = {
  src: string;
  alt: string;
};

const SLIDE_INTERVAL_MS = 4000;

/**
 * Migrado do bloco "3) Carrossel Automático" de index.html. Hoje só existe
 * 1 foto aproveitável para o carrossel (ver comentário em ImplantsSection),
 * então nem os dots nem o auto-play entram em cena — mas o componente foi
 * generalizado para aceitar várias fotos (`slides`), reproduzindo o mesmo
 * comportamento do script original: setInterval só roda com mais de 1
 * slide, e os dots (role="tab", operáveis por teclado com Enter/Espaço)
 * só são renderizados quando fazem sentido.
 */
export default function Carousel({ slides, caption }: { slides: CarouselSlide[]; caption: string }) {
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (slides.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [slides.length]);

  function goTo(i: number) {
    setIndex(i);
    if (slides.length <= 1) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);
  }

  return (
    <div className="carousel-container">
      {slides.map((slide, i) => (
        <div className={`carousel-slide${i === index ? " active" : ""}`} key={slide.src}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ver nota em ImplantsSection sobre next/image e Cloudflare Workers */}
          <img src={slide.src} alt={slide.alt} />
        </div>
      ))}

      <p className="carousel-caption">{caption}</p>

      {slides.length > 1 && (
        <div className="carousel-dots" role="tablist" aria-label="Fotos do carrossel">
          {slides.map((slide, i) => (
            <span
              key={slide.src}
              className={`dot${i === index ? " active" : ""}`}
              role="tab"
              tabIndex={0}
              aria-selected={i === index}
              onClick={() => goTo(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goTo(i);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
