import BookingForm from "./BookingForm";
import WhatsAppInlineLink from "./WhatsAppInlineLink";

export default function BookingSection() {
  return (
    <section id="contato" className="booking">
      <div className="wrap">
        <div className="booking-box reveal">
          <div className="booking-left">
            <div className="eyebrow">Agendamento</div>
            <h2>Marque sua avaliação e conheça seu plano de tratamento.</h2>
            <p>
              A primeira consulta inclui escaneamento digital e um plano por escrito, sem
              compromisso. Preencha o formulário ou fale direto pelo WhatsApp.
            </p>
            <WhatsAppInlineLink />
          </div>

          <BookingForm />
        </div>
      </div>
    </section>
  );
}
