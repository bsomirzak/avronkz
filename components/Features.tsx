export function Features() {
  return (
    <section className="features">
      <div className="feature">
        <div className="feature-icon" style={{ background: "#FFE891" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#0F1B3D" strokeWidth="2">
            <path d="M1 3h15v13H1z" />
            <path d="M16 8h4l3 3v5h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
        </div>
        <div>
          <div className="feature-title">Доставка по Алматы</div>
          <div className="feature-desc">Бесплатно при заказе от 50 000 ₸</div>
        </div>
      </div>
      <div className="feature">
        <div className="feature-icon" style={{ background: "#D4F0CE" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#0F1B3D" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
        </div>
        <div>
          <div className="feature-title">Гарантия 12 месяцев</div>
          <div className="feature-desc">Официальная гарантия производителя</div>
        </div>
      </div>
      <div className="feature">
        <div className="feature-icon" style={{ background: "#FFD9D9" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#0F1B3D" strokeWidth="2">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>
        <div>
          <div className="feature-title">Оплата через Каспи</div>
          <div className="feature-desc">Рассрочка 0-0-12</div>
        </div>
      </div>
      <div className="feature">
        <div className="feature-icon" style={{ background: "#D6EBFF" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#0F1B3D" strokeWidth="2">
            <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
          </svg>
        </div>
        <div>
          <div className="feature-title">Поддержка ежедневно</div>
          <div className="feature-desc">Звоните в WhatsApp, отвечаем быстро</div>
        </div>
      </div>
    </section>
  );
}
