import { CheckCircle2, CircleDollarSign, CreditCard, ExternalLink, Smartphone, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { API_URL } from '../lib/config';
import type { Course, CurrencyCode, Language, OrderPayload, OrderResponse, PaymentMethod } from '../types';
import { formatMoney } from './CourseCard';
import { CourseIcon } from './CourseIcon';

type Props = {
  open: boolean;
  course: Course | null;
  lang: Language;
  currency: CurrencyCode;
  rate: number;
  text: Record<string, string>;
  paymentMethods: PaymentMethod[];
  onClose: () => void;
};

function PaymentIcon({ method }: { method: PaymentMethod }) {
  if (method.group === 'crypto') return <CircleDollarSign size={17} />;
  if (method.group === 'bank') return <CreditCard size={17} />;
  return <Smartphone size={17} />;
}

export function OrderModal({ open, course, lang, currency, rate, text, paymentMethods, onClose }: Props) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<OrderResponse | null>(null);
  const firstInput = useRef<HTMLInputElement>(null);

  const selectedPayment = useMemo(
    () => paymentMethods.find((item) => item.id === paymentMethod) || null,
    [paymentMethod, paymentMethods],
  );

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('modal-open');
    const timer = window.setTimeout(() => firstInput.current?.focus(), 60);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !sending) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('modal-open');
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, sending]);

  useEffect(() => {
    if (open) {
      setError('');
      setSuccess(null);
      setName('');
      setContact('');
      setNotes('');
      setPaymentReference('');
      setPaymentMethod(paymentMethods.find((item) => item.configured)?.id || paymentMethods[0]?.id || '');
    }
  }, [open, course?.code, paymentMethods]);

  if (!open || !course) return null;
  const price = course.priceEgp * rate;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !contact.trim()) {
      setError(text.required);
      return;
    }
    setError('');
    setSending(true);
    const payload: OrderPayload = {
      course_code: course!.code,
      customer_name: name.trim(),
      contact: contact.trim(),
      notes: notes.trim() || undefined,
      currency,
      payment_method: paymentMethod || undefined,
      payment_reference: paymentReference.trim() || undefined,
    };
    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('order_failed');
      const result = await response.json() as OrderResponse;
      setSuccess(result);
    } catch {
      setError(text.requestFailed);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !sending) onClose(); }}>
      <section className="order-modal order-modal-v4" role="dialog" aria-modal="true" aria-labelledby="order-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label={text.close}><X size={18} /></button>
        {success ? (
          <div className="success-state">
            <span className="success-icon"><CheckCircle2 size={28} /></span>
            <h2 id="order-title">{text.orderSuccess}</h2>
            <p>{text.orderSuccessCopy}</p>
            <div className="order-id"><span>{text.orderId}</span><strong dir="ltr">{success.order_id}</strong></div>
            <button className="primary-button modal-primary" type="button" onClick={onClose}>{text.close}</button>
          </div>
        ) : (
          <>
            <div className="modal-heading">
              <span className="modal-eyebrow">{course.type} · {course.semester}</span>
              <h2 id="order-title">{text.requestTitle}</h2>
              <p>{text.requestSubtitle}</p>
            </div>

            <div className="order-summary order-summary-v4">
              <span className="summary-course-icon"><CourseIcon name={course.icon} size={20} /></span>
              <div className="summary-course-copy">
                <span dir="ltr">{course.code}</span>
                <small className={`order-course-title ${course.title ? '' : 'unresolved'}`}>{course.title || text.titleUnavailable}</small>
                <small>{lang === 'ar' ? course.facultyAr : course.faculty}</small>
              </div>
              <strong>{formatMoney(price, currency, lang)} <em>{currency}</em></strong>
            </div>

            <div className="modal-course-description">
              <span>{text.courseDescription}</span>
              <p>{course.description || text.descriptionPending}</p>
              {course.descriptionSource && course.description && (
                <a href={course.descriptionSource} target="_blank" rel="noreferrer">{text.aouSource}<ExternalLink size={12} /></a>
              )}
            </div>

            <form onSubmit={submit} className="order-form">
              <label><span>{text.name}</span><input ref={firstInput} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
              <label><span>{text.contact}</span><input value={contact} onChange={(e) => setContact(e.target.value)} inputMode="tel" maxLength={80} /></label>

              <fieldset className="payment-picker">
                <legend>{text.choosePayment}</legend>
                <div className="payment-picker-grid">
                  {paymentMethods.map((method) => (
                    <label className={`payment-option ${paymentMethod === method.id ? 'selected' : ''}`} key={method.id}>
                      <input
                        type="radio"
                        name="payment-method"
                        value={method.id}
                        checked={paymentMethod === method.id}
                        onChange={() => setPaymentMethod(method.id)}
                      />
                      <span className="payment-option-icon"><PaymentIcon method={method} /></span>
                      <span><strong>{method.label}</strong><small>{method.network || method.currency}</small></span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {selectedPayment && (
                <div className={`selected-payment ${selectedPayment.configured ? 'configured' : ''}`}>
                  <div>
                    <strong>{selectedPayment.label}</strong>
                    <span>{selectedPayment.configured ? text.paymentDestination : text.paymentConfiguredLater}</span>
                  </div>
                  {selectedPayment.destination && <code dir="ltr">{selectedPayment.destination}</code>}
                  {selectedPayment.group === 'crypto' && <small>{text.paymentNetworkWarning}</small>}
                </div>
              )}

              <label><span>{text.paymentReference}</span><input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} maxLength={120} placeholder={text.paymentReferencePlaceholder} /></label>
              <label><span>{text.notes}</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} /></label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={onClose} disabled={sending}>{text.cancel}</button>
                <button className="primary-button modal-primary" type="submit" disabled={sending}>{sending ? text.submitting : text.submit}</button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
