import About from "./components/About";
import BookingSection from "./components/BookingSection";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Hero from "./components/Hero";
import ImplantsSection from "./components/ImplantsSection";
import RevealObserver from "./components/RevealObserver";
import Services from "./components/Services";
import TrustStrip from "./components/TrustStrip";
import WhatsAppFloat from "./components/WhatsAppFloat";

export default function Home() {
  return (
    <>
      <Header />
      <main id="top">
        <Hero />
        <TrustStrip />
        <Services />
        <ImplantsSection />
        <About />
        {/* Seção de depoimentos removida em 2026-08-14: os depoimentos eram
            fictícios (texto de exemplo), confirmado pelo dono do site — não
            fazia sentido publicá-los como se fossem pacientes reais, e a
            Resolução CFO-196/2019 já restringe esse tipo de conteúdo mesmo
            quando genuíno. Ver PRIVACIDADE.md/TERMOS.md. */}
        <BookingSection />
      </main>
      <Footer />
      <WhatsAppFloat />
      <RevealObserver />
    </>
  );
}
