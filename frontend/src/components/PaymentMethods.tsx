import {
  BadgeDollarSign, CheckCircle2, CircleDollarSign, Copy, ShieldCheck, Smartphone,
} from 'lucide-react';
import { useState } from 'react';
import type { Language, PaymentMethod } from '../types';

function PaymentIcon({ method }: { method: PaymentMethod }) {
  if (method.group === 'crypto') return <CircleDollarSign size={20} />;
  if (method.group === 'bank') return <BadgeDollarSign size={20} />;
  return <Smartphone size={20} />;
}

export function PaymentMethods({
  items, lang, isInternational, text,
}: {
  items: PaymentMethod[];
  lang: Language;
  isInternational: boolean;
  text: Record<string, string>;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const filteredItems = isInternational
    ? items.filter((m) => m.group === 'crypto')
    : items.filter((m) => m.group !== 'crypto');

  async function copyDestination(method: PaymentMethod) {
    if (!method.destination) return;
    await navigator.clipboard?.writeText(method.destination);
    setCopied(method.id);
    window.setTimeout(() => setCopied(null), 1500);
  }

  return (
    <section className="payment-section" id="payments">
      <div className="payment-heading">
        <div>
          <span className="section-eyebrow">{text.paymentEyebrow}</span>
          <h2>{text.paymentTitle}</h2>
          <p>{text.paymentSubtitle}</p>
        </div>
        <span className="secure-chip"><ShieldCheck size={15} />{text.paymentSecure}</span>
      </div>

      <div className="payment-grid">
        {filteredItems.map((method) => (
          <article className={`payment-card ${method.configured ? 'configured' : ''}`} key={method.id}>
            <div className="payment-icon"><PaymentIcon method={method} /></div>
            <div className="payment-copy">
              <div className="payment-title-row">
                <h3>{method.label}</h3>
                <span>{method.currency}</span>
              </div>
              <p>
                {method.group === 'crypto'
                  ? `${method.network || 'USDT'} · ${text.internationalPayment}`
                  : method.id === 'instapay'
                    ? text.instantBankTransfer
                    : text.mobileWalletTransfer}
              </p>

              {method.configured && method.destination ? (
                <div className="payment-destination">
                  <code dir="ltr">{method.destination}</code>
                  <button type="button" onClick={() => copyDestination(method)} aria-label={text.copy}>
                    {copied === method.id ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                  </button>
                </div>
              ) : (
                <span className="payment-not-configured">{text.paymentConfiguredLater}</span>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="payment-note">
        <ShieldCheck size={17} />
        <p>{text.paymentNetworkWarning}</p>
      </div>
    </section>
  );
}
