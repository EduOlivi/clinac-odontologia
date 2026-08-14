"use client";

import { trackEvent } from "../lib/analytics";
import { WHATSAPP_URL } from "../lib/site-config";

export default function WhatsAppFloat() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener"
      className="wa-float"
      aria-label="Falar no WhatsApp"
      onClick={() => trackEvent("whatsapp_click", { source: "floating" })}
    >
      <span className="wa-tooltip">Fale conosco no WhatsApp</span>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.5 14.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-2-1.8-2.3-.2-.3 0-.5.1-.6.1-.1.3-.4.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5C9.4 9 8.9 7.8 8.7 7.3c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.4z" />
        <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.6 1.4 5.1L2 22l5.1-1.3C8.5 21.6 10.2 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.6 0-3.2-.4-4.5-1.2l-.3-.2-3.3.9.9-3.2-.2-.3C3.7 14.7 3.2 13 3.2 12 3.2 7.1 7.1 3.2 12 3.2S20.8 7.1 20.8 12 16.9 20.2 12 20.2z" />
      </svg>
    </a>
  );
}
