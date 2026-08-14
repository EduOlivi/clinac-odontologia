import About from "./components/About";
import BookingSection from "./components/BookingSection";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Hero from "./components/Hero";
import ImplantsSection from "./components/ImplantsSection";
import RevealObserver from "./components/RevealObserver";
import Services from "./components/Services";
import Testimonials from "./components/Testimonials";
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
        <Testimonials />
        <BookingSection />
      </main>
      <Footer />
      <WhatsAppFloat />
      <RevealObserver />
    </>
  );
}
