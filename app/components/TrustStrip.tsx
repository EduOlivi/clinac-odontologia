const ITEMS = [
  "Escaneamento digital sem moldagem",
  "Atendimento infantil especializado",
  "Parcelamento em até 12x",
  "Convênios e particular",
];

export default function TrustStrip() {
  return (
    <div className="trust">
      <div className="wrap">
        {ITEMS.map((item) => (
          <div className="trust-item" key={item}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>{" "}
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
