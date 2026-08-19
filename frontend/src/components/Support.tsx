import { memo } from 'react';

type Props = { text: Record<string, string> };

export const Support = memo(function Support({ text }: Props) {
  return (
    <section className="support-section" id="support-page">
      <div className="support-container">
        <p className="section-eyebrow">SUPPORT</p>
        <h2 className="support-title">{text.supportTitle}</h2>
        <p className="support-subtitle">{text.supportSubtitle}</p>

        <div className="support-grid">
          <div className="support-faq">
            <h3 className="support-section-title">{text.supportFaq}</h3>
            <div className="faq-list">
              {[
                [text.supportFaqQ1, text.supportFaqA1],
                [text.supportFaqQ2, text.supportFaqA2],
                [text.supportFaqQ3, text.supportFaqA3],
                [text.supportFaqQ4, text.supportFaqA4],
                [text.supportFaqQ5, text.supportFaqA5],
              ].map(([q, a], i) => (
                <details className="faq-item" key={i}>
                  <summary className="faq-question">{q}</summary>
                  <p className="faq-answer">{a}</p>
                </details>
              ))}
            </div>
          </div>

          <div className="support-contact">
            <h3 className="support-section-title">{text.supportContact}</h3>
            <div className="contact-cards">
              <a href="https://wa.me/201000000000" target="_blank" rel="noreferrer" className="contact-card">
                <span className="contact-icon">💬</span>
                <span className="contact-label">{text.supportWhatsApp}</span>
                <span className="contact-value">+20 100 000 0000</span>
              </a>
              <a href="tel:+201000000000" className="contact-card">
                <span className="contact-icon">📞</span>
                <span className="contact-label">{text.supportPhone}</span>
                <span className="contact-value">+20 100 000 0000</span>
              </a>
              <a href="mailto:support@aou-tma.com" className="contact-card">
                <span className="contact-icon">✉️</span>
                <span className="contact-label">{text.supportEmail}</span>
                <span className="contact-value">support@aou-tma.com</span>
              </a>
            </div>
            <div className="contact-hours">
              <span className="contact-hours-label">{text.supportHours}</span>
              <span className="contact-hours-value">{text.supportHoursValue}</span>
            </div>
          </div>
        </div>

        <p className="support-disclaimer">{text.supportNote}</p>
      </div>
    </section>
  );
});
