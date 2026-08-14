"use client";

import { trackEvent } from "../lib/analytics";
import { WHATSAPP_URL } from "../lib/site-config";

export default function WhatsAppInlineLink() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener"
      className="btn btn-outline"
      style={{ borderColor: "#fff", color: "#fff" }}
      onClick={() => trackEvent("whatsapp_click", { source: "inline" })}
    >
      Chamar no WhatsApp
    </a>
  );
}
