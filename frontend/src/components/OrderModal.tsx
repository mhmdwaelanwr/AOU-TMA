import { CheckCircle2, CircleDollarSign, CreditCard, ExternalLink, Gift, Play, Smartphone, X, FileText, Tag, Upload, ChevronLeft, ChevronRight, User, Banknote, FileCheck, Users, MessageCircle, BookOpen, ClipboardList, AlertTriangle, Shield, Lock, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { API_URL, branches as allBranches } from '../lib/config';
import { useAuth } from '../lib/auth';
import type { Branch, BranchId, Course, CurrencyCode, Language, OrderPayload, OrderResponse, PaymentMethod, ServiceType, ServicePrices } from '../types';
import { formatMoney } from './CourseCard';
import { CourseIcon } from './CourseIcon';

const SERVICE_OPTIONS: { type: ServiceType; icon: React.ReactNode; labelAr: string; labelEn: string; descAr: string; descEn: string }[] = [
  { type: 'TMA', icon: <FileText size={20} />, labelAr: 'TMA', labelEn: 'TMA', descAr: 'تسليمات', descEn: 'Assignments' },
  { type: 'QUIZ', icon: <ClipboardList size={20} />, labelAr: 'Quiz', labelEn: 'Quiz', descAr: 'حل ومراجعة', descEn: 'Solve & review' },
  { type: 'ASSIGNMENT', icon: <BookOpen size={20} />, labelAr: 'Assignment', labelEn: 'Assignment', descAr: 'تسليمات إضافية', descEn: 'Extra submissions' },
];

const BRANCH_PAYMENTS: Record<string, { id: string; label: string; labelAr: string; group: string; icon: string }[]> = {
  egypt: [
    { id: 'vodafone_cash', label: 'Vodafone Cash', labelAr: 'فودافون كاش', group: 'wallet', icon: '📱' },
    { id: 'instapay', label: 'InstaPay', labelAr: 'إنستاباي', group: 'bank', icon: '🏦' },
    { id: 'etisalat_cash', label: 'Etisalat Cash', labelAr: 'اتصالات كاش', group: 'wallet', icon: '📱' },
    { id: 'orange_cash', label: 'Orange Cash', labelAr: 'أورنج كاش', group: 'wallet', icon: '📱' },
    { id: 'we_pay', label: 'We Pay', labelAr: 'وي باي', group: 'wallet', icon: '📱' },
    { id: 'bank_transfer', label: 'Bank Transfer', labelAr: 'تحويل بنكي', group: 'bank', icon: '🏦' },
  ],
  kuwait: [
    { id: 'usdt_trc20', label: 'USDT (TRC20)', labelAr: 'USDT (TRC20)', group: 'crypto', icon: '💲' },
    { id: 'usdt_erc20', label: 'USDT (ERC20)', labelAr: 'USDT (ERC20)', group: 'crypto', icon: '💲' },
    { id: 'kw_knet', label: 'KNET', labelAr: 'KNET', group: 'bank', icon: '🏦' },
  ],
  saudi: [
    { id: 'usdt_trc20', label: 'USDT (TRC20)', labelAr: 'USDT (TRC20)', group: 'crypto', icon: '💲' },
    { id: 'usdt_erc20', label: 'USDT (ERC20)', labelAr: 'USDT (ERC20)', group: 'crypto', icon: '💲' },
    { id: 'sa_mada', label: 'Mada Card', labelAr: 'بطاقة مدى', group: 'bank', icon: '🏦' },
    { id: 'sa_stc_pay', label: 'STC Pay', labelAr: 'STC Pay', group: 'wallet', icon: '📱' },
  ],
  bahrain: [
    { id: 'usdt_trc20', label: 'USDT (TRC20)', labelAr: 'USDT (TRC20)', group: 'crypto', icon: '💲' },
    { id: 'bh_benefit', label: 'BenefitPay', labelAr: 'BenefitPay', group: 'wallet', icon: '📱' },
  ],
  jordan: [
    { id: 'usdt_trc20', label: 'USDT (TRC20)', labelAr: 'USDT (TRC20)', group: 'crypto', icon: '💲' },
    { id: 'jo_fawry', label: 'Fawry', labelAr: 'Fawry', group: 'wallet', icon: '📱' },
  ],
  lebanon: [
    { id: 'usdt_trc20', label: 'USDT (TRC20)', labelAr: 'USDT (TRC20)', group: 'crypto', icon: '💲' },
  ],
  oman: [
    { id: 'usdt_trc20', label: 'USDT (TRC20)', labelAr: 'USDT (TRC20)', group: 'crypto', icon: '💲' },
    { id: 'om_masan', label: 'mPay / Sanad', labelAr: 'mPay / Sanad', group: 'wallet', icon: '📱' },
  ],
  sudan: [
    { id: 'usdt_trc20', label: 'USDT (TRC20)', labelAr: 'USDT (TRC20)', group: 'crypto', icon: '💲' },
  ],
  palestine: [
    { id: 'usdt_trc20', label: 'USDT (TRC20)', labelAr: 'USDT (TRC20)', group: 'crypto', icon: '💲' },
    { id: 'ps_palpay', label: 'PalPay', labelAr: 'PalPay', group: 'wallet', icon: '📱' },
  ],
  morocco: [
    { id: 'usdt_trc20', label: 'USDT (TRC20)', labelAr: 'USDT (TRC20)', group: 'crypto', icon: '💲' },
    { id: 'ma_cashplus', label: 'Cash Plus', labelAr: 'Cash Plus', group: 'wallet', icon: '📱' },
    { id: 'ma_cbimobile', label: 'CBIMobile', labelAr: 'CBIMobile', group: 'wallet', icon: '📱' },
  ],
};

type Props = {
  open: boolean;
  course: Course | null;
  lang: Language;
  branch: Branch;
  currency: CurrencyCode;
  rate: number;
  isInternational: boolean;
  text: Record<string, string>;
  paymentMethods: PaymentMethod[];
  onClose: () => void;
};

export function OrderModal({ open, course, lang, branch, currency, rate, isInternational, text, paymentMethods, onClose }: Props) {
  const { user, token } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('TMA');
  const [tmaFile, setTmaFile] = useState<File | null>(null);
  const [lmsUsername, setLmsUsername] = useState('');
  const [lmsPassword, setLmsPassword] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [depositProof, setDepositProof] = useState<File | null>(null);
  const [depositTxHash, setDepositTxHash] = useState('');
  const [notes, setNotes] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralCredit, setReferralCredit] = useState(0);
  const [referralError, setReferralError] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<OrderResponse | null>(null);
  const [servicePrices, setServicePrices] = useState<Record<ServiceType, number>>({ TMA: 150, QUIZ: 29, ASSIGNMENT: 150 });
  const [firstOrderDiscount, setFirstOrderDiscount] = useState(0);
  const [showLmsConfirm, setShowLmsConfirm] = useState(false);
  const [lmsBranchOverride, setLmsBranchOverride] = useState<BranchId | ''>('');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const firstInput = useRef<HTMLInputElement>(null);

  const isOnsite = course?.type === 'ONSITE';
  const isQuiz = serviceType === 'QUIZ';
  const DEPOSIT = 29;
  const effectiveBranch = lmsBranchOverride ? allBranches.find(b => b.id === lmsBranchOverride) || branch : branch;

  const steps = isOnsite
    ? [{ icon: <User size={16} />, labelAr: 'بياناتك', labelEn: 'Your Info' }, { icon: <FileCheck size={16} />, labelAr: 'المراجعة', labelEn: 'Review' }]
    : [
        { icon: <MessageCircle size={16} />, labelAr: 'التواصل', labelEn: 'Contact' },
        { icon: <FileText size={16} />, labelAr: 'الخدمة', labelEn: 'Service' },
        ...(isQuiz
          ? [{ icon: <ClipboardList size={16} />, labelAr: 'بيانات LMS', labelEn: 'LMS Data' }]
          : [{ icon: <Banknote size={16} />, labelAr: 'السعر', labelEn: 'Price' }]
        ),
        { icon: <CreditCard size={16} />, labelAr: 'الدفع', labelEn: 'Payment' },
      ];

  const branchPayments = BRANCH_PAYMENTS[branch.id] || BRANCH_PAYMENTS.egypt;
  const basePrice = servicePrices[serviceType] || 150;

  // QUIZ: no discounts at all
  const totalDiscount = isQuiz ? 0 : Math.min(firstOrderDiscount + promoDiscount + referralCredit, basePrice);
  const finalPrice = Math.max(basePrice - totalDiscount, 0);
  const depositAmount = isQuiz ? basePrice : Math.min(DEPOSIT, finalPrice);
  const remainingAfterDeposit = isQuiz ? 0 : Math.max(finalPrice - depositAmount, 0);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('modal-open');
    const timer = window.setTimeout(() => firstInput.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !sending) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.classList.remove('modal-open'); window.clearTimeout(timer); window.removeEventListener('keydown', onKey); };
  }, [open, onClose, sending]);

  useEffect(() => {
    if (open) {
      setStep(0); setPaymentMethod(''); setNotes(''); setTmaFile(null); setDepositProof(null); setDepositTxHash('');
      setLmsUsername(''); setLmsPassword(''); setShowLmsConfirm(false); setLmsBranchOverride(''); setShowBranchDropdown(false);
      setPromoCode(''); setPromoDiscount(0); setPromoError(''); setError(''); setSuccess(null);
      setReferralCode(''); setReferralCredit(0); setReferralError('');
      if (user) {
        setName(user.name); setEmail(user.email); setContact('');
      } else {
        setName(''); setContact(''); setEmail('');
      }
      fetch(`${API_URL}/api/service-prices?branch=${branch.id === 'egypt' ? 'EG' : branch.id.toUpperCase().slice(0, 2)}`)
        .then(r => r.ok ? r.json() : null)
        .then((d: ServicePrices | null) => { if (d?.prices) setServicePrices(d.prices); })
        .catch(() => {});
      if (user) {
        setFirstOrderDiscount(basePrice * 0.20);
      } else {
        setFirstOrderDiscount(0);
      }
    }
  }, [open, course?.code, user, branch.id]);

  if (!open || !course) return null;

  function applyPromo() {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    fetch(`${API_URL}/api/promo/validate?code=${encodeURIComponent(code)}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { setPromoDiscount(basePrice * data.discount_pct / 100); setPromoError(''); })
      .catch(() => { setPromoDiscount(0); setPromoError(lang === 'ar' ? 'كود الخصم غير صالح' : 'Invalid promo code'); });
  }

  async function applyReferral() {
    const code = referralCode.trim().toUpperCase();
    if (!code) return;
    try {
      const res = await fetch(`${API_URL}/api/referral/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      if (!res.ok) { setReferralCredit(0); setReferralError(lang === 'ar' ? 'كود الإحالة غير صالح' : 'Invalid referral code'); return; }
      const data = await res.json();
      setReferralCredit(data.credit_amount);
      setReferralError('');
    } catch { setReferralCredit(0); setReferralError(lang === 'ar' ? 'تحقق من الكود' : 'Check the code'); }
  }

  function canNext() {
    if (step === 0) return contact.trim().length >= 3;
    if (step === 1) return true; // service selection
    if (step === 2 && isQuiz) return lmsUsername.trim().length >= 3 && lmsPassword.trim().length >= 1;
    return true;
  }

  function handleNext() {
    if (step === 2 && isQuiz) {
      setShowLmsConfirm(true);
      return;
    }
    setStep(step + 1);
  }

  function handleLmsConfirm() {
    setShowLmsConfirm(false);
    setStep(3);
  }

  async function handleSubmit() {
    if (!course) return;
    setError('');
    setSending(true);
    const payload: OrderPayload = {
      course_code: course.code, customer_name: name.trim() || (user?.name ?? ''), contact: contact.trim(),
      email: email.trim() || undefined, notes: notes.trim() || undefined, currency,
      service_type: serviceType, branch: branch.id,
      payment_method: paymentMethod || undefined,
      promo_code: isQuiz ? undefined : (promoCode.trim().toUpperCase() || undefined),
      referral_code: isQuiz ? undefined : (referralCode.trim().toUpperCase() || undefined),
      deposit_tx_hash: depositTxHash.trim() || undefined,
      lms_username: isQuiz ? lmsUsername.trim() || undefined : undefined,
      lms_password: isQuiz ? lmsPassword.trim() || undefined : undefined,
    };
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_URL}/api/orders`, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('failed');
      setSuccess(await res.json() as OrderResponse);
    } catch { setError(text.requestFailed); }
    finally { setSending(false); }
  }

  function renderStepContent() {
    if (isOnsite) {
      if (step === 0) return (
        <div className="modal-wizard-content">
          <div className="modal-wizard-icon"><Gift size={28} /></div>
          <h3>{text.claimTitle}</h3>
          <label className="form-field"><span>{text.name}</span><input ref={firstInput} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={lang === 'ar' ? 'اسمك الكامل' : 'Your full name'} /></label>
          <label className="form-field"><span>{text.contact}</span><input value={contact} onChange={(e) => setContact(e.target.value)} inputMode="tel" maxLength={80} placeholder={lang === 'ar' ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'} /></label>
          <label className="form-field"><span>{text.notes}</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} placeholder={lang === 'ar' ? 'ملاحظات إضافية' : 'Additional notes'} /></label>
        </div>
      );
      return (
        <div className="modal-wizard-content">
          <div className="modal-wizard-icon"><CheckCircle2 size={28} /></div>
          <h3>{lang === 'ar' ? 'مراجعة الطلب' : 'Review Order'}</h3>
          <div className="modal-review-card">
            <div className="review-row"><span>{text.selectCourse}</span><strong dir="ltr">{course!.code}</strong></div>
            <div className="review-row"><span>{text.name}</span><strong>{name || user?.name}</strong></div>
            <div className="review-row"><span>{text.contact}</span><strong dir="ltr">{contact}</strong></div>
            {email && <div className="review-row"><span>{text.email}</span><strong dir="ltr">{email}</strong></div>}
            {notes && <div className="review-row"><span>{text.notes}</span><strong>{notes}</strong></div>}
          </div>
        </div>
      );
    }

    // Step 0 — Contact (all non-onsite)
    if (step === 0) return (
      <div className="modal-wizard-content">
        <div className="modal-wizard-icon"><MessageCircle size={28} /></div>
        <h3>{lang === 'ar' ? 'بيانات التواصل' : 'Contact Information'}</h3>
        <p className="modal-wizard-desc">{lang === 'ar' ? 'واتساب إجباري عشان نتواصل معاك' : 'WhatsApp is required so we can reach you'}</p>
        <label className="form-field form-field-required">
          <span><Smartphone size={14} /> {lang === 'ar' ? 'واتساب (إجباري)' : 'WhatsApp (required)'}</span>
          <input ref={firstInput} value={contact} onChange={(e) => setContact(e.target.value)} inputMode="tel" maxLength={80} placeholder={lang === 'ar' ? 'رقم الواتساب' : 'WhatsApp number'} required />
        </label>
        <label className="form-field">
          <span>{lang === 'ar' ? 'الاسم' : 'Name'}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={lang === 'ar' ? 'اسمك (اختياري)' : 'Your name (optional)'} />
        </label>
        <label className="form-field">
          <span>{text.email}</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" maxLength={120} placeholder="your@email.com" />
        </label>
        <label className="form-field">
          <span>{text.notes}</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} placeholder={lang === 'ar' ? 'أي تفاصيل إضافية' : 'Any additional details'} />
        </label>
      </div>
    );

    // Step 1 — Service Selection (all non-onsite, always same)
    if (step === 1) return (
      <div className="modal-wizard-content">
        <div className="modal-wizard-icon"><FileText size={28} /></div>
        <h3>{lang === 'ar' ? 'اختار الخدمة' : 'Choose Service'}</h3>
        <div className="service-type-grid">
          {SERVICE_OPTIONS.map(opt => (
            <button key={opt.type} className={`service-type-card ${serviceType === opt.type ? 'active' : ''}`} type="button" onClick={() => setServiceType(opt.type)}>
              <div className="service-type-icon">{opt.icon}</div>
              <strong>{opt.type}</strong>
              <small>{lang === 'ar' ? opt.descAr : opt.descEn}</small>
            </button>
          ))}
        </div>
        {!isQuiz && (
          <label className="tma-dropzone-inline">
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size <= 10 * 1024 * 1024) setTmaFile(f); }} />
            {tmaFile ? (
              <div className="wizard-file-info"><FileText size={18} /><span>{tmaFile.name}</span><button type="button" className="wizard-file-remove" onClick={(e) => { e.stopPropagation(); setTmaFile(null); }}><X size={14} /></button></div>
            ) : (
              <><Upload size={18} /><span>{lang === 'ar' ? 'ارفع ملف التعليمات (اختياري)' : 'Upload instructions (optional)'}</span></>
            )}
          </label>
        )}
      </div>
    );

    // Step 2 — QUIZ: LMS Data | TMA/ASSIGNMENT: Price Breakdown
    if (step === 2 && isQuiz) return (
      <div className="modal-wizard-content">
        <div className="modal-wizard-icon"><ClipboardList size={28} /></div>
        <h3>{lang === 'ar' ? 'بيانات الدخول على LMS' : 'LMS Login Details'}</h3>

        <div className="lms-branch-selector">
          <span className="lms-branch-label">{lang === 'ar' ? 'الفرع:' : 'Branch:'}</span>
          <div className="lms-branch-current" onClick={() => setShowBranchDropdown(!showBranchDropdown)}>
            <span>{effectiveBranch.flag} {effectiveBranch.name[lang]}</span>
            <ChevronDown size={14} />
          </div>
          {showBranchDropdown && (
            <div className="lms-branch-dropdown">
              {allBranches.map(b => (
                <button key={b.id} type="button" className={`lms-branch-option ${b.id === effectiveBranch.id ? 'active' : ''}`} onClick={() => { setLmsBranchOverride(b.id as BranchId); setShowBranchDropdown(false); }}>
                  <span>{b.flag}</span><span>{b.name[lang]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="quiz-notice">
          <AlertTriangle size={16} />
          <span>{lang === 'ar' ? 'تنويه: أدخل بيانات صحيحة عشان نقدر نحل الكويز. لو البيانات غلط، مش هنقدر ننفّذ الطلب ومش هيرجّع الفلوس.' : 'Important: Enter correct credentials. Wrong data means we cannot complete the order and no refund will be issued.'}</span>
        </div>
        <label className="form-field form-field-required">
          <span>{lang === 'ar' ? 'اسم المستخدم (LMS)' : 'LMS Username'}</span>
          <input value={lmsUsername} onChange={(e) => setLmsUsername(e.target.value)} maxLength={120} placeholder={lang === 'ar' ? 'اسم المستخدم على منصة LMS' : 'Your LMS username'} required />
        </label>
        <label className="form-field form-field-required">
          <span>{lang === 'ar' ? 'كلمة المرور (LMS)' : 'LMS Password'}</span>
          <input type="password" value={lmsPassword} onChange={(e) => setLmsPassword(e.target.value)} maxLength={120} placeholder={lang === 'ar' ? 'كلمة المرور على منصة LMS' : 'Your LMS password'} required />
        </label>
        <div className="quiz-price-note">
          <CircleDollarSign size={16} />
          <span>{lang === 'ar' ? `سعر الحل: ${formatMoney(basePrice, currency, lang)} ${currency} — بدون خصومات` : `Solve price: ${formatMoney(basePrice, currency, lang)} ${currency} — no discounts`}</span>
        </div>
      </div>
    );

    // Step 2 — TMA/ASSIGNMENT: Price Breakdown
    return (
      <div className="modal-wizard-content">
        <div className="modal-wizard-icon"><Banknote size={28} /></div>
        <h3>{lang === 'ar' ? 'تفاصيل السعر' : 'Price Breakdown'}</h3>
        <div className="modal-review-card">
          <div className="review-row"><span>{text.selectCourse}</span><strong dir="ltr">{course!.code}</strong></div>
          <div className="review-row"><span>{lang === 'ar' ? 'الخدمة' : 'Service'}</span><strong>{serviceType}</strong></div>
          <div className="review-row review-total-row"><span>{lang === 'ar' ? 'السعر الأساسي' : 'Base price'}</span><strong dir="ltr">{formatMoney(basePrice, currency, lang)} {isInternational ? 'USDT' : currency}</strong></div>
          {firstOrderDiscount > 0 && (
            <div className="review-row review-discount">
              <span>🎉 {lang === 'ar' ? 'خصم أول طلب (20%)' : 'First order discount (20%)'}</span>
              <strong dir="ltr">-{formatMoney(firstOrderDiscount, currency, lang)}</strong>
            </div>
          )}
          {promoDiscount > 0 && (
            <div className="review-row review-discount">
              <span><Tag size={12} /> {lang === 'ar' ? `خصم كود ${promoCode.toUpperCase()}` : `Promo ${promoCode.toUpperCase()}`}</span>
              <strong dir="ltr">-{formatMoney(promoDiscount, currency, lang)}</strong>
            </div>
          )}
          {referralCredit > 0 && (
            <div className="review-row review-discount">
              <span><Users size={12} /> {lang === 'ar' ? 'خصم الإحالة' : 'Referral credit'}</span>
              <strong dir="ltr">-{formatMoney(referralCredit, currency, lang)}</strong>
            </div>
          )}
          <div className="review-row review-total">
            <span>{lang === 'ar' ? 'المبلغ الإجمالي' : 'Total'}</span>
            <strong dir="ltr">{formatMoney(finalPrice, currency, lang)} {isInternational ? 'USDT' : currency}</strong>
          </div>
        </div>
        <div className="deposit-notice">
          <CircleDollarSign size={18} />
          <div>
            <strong>{lang === 'ar' ? `دفع مقدم: ${formatMoney(depositAmount, currency, lang)} ${currency}` : `Deposit: ${formatMoney(depositAmount, currency, lang)} ${currency}`}</strong>
            <small>{lang === 'ar' ? `والباقي ${formatMoney(remainingAfterDeposit, currency, lang)} بعد المراجعة` : `Remaining ${formatMoney(remainingAfterDeposit, currency, lang)} after review`}</small>
          </div>
        </div>
        <div className="promo-section">
          <label className="promo-label"><Tag size={14} /> {lang === 'ar' ? 'كود الخصم (اختياري)' : 'Promo code (optional)'}</label>
          <div className="promo-input-row">
            <input className="promo-input" value={promoCode} onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); setPromoDiscount(0); }} placeholder={lang === 'ar' ? 'أدخل كود الخصم' : 'Enter promo code'} maxLength={20} />
            <button className="promo-apply-btn" type="button" onClick={applyPromo} disabled={!promoCode.trim()}>{lang === 'ar' ? 'تطبيق' : 'Apply'}</button>
          </div>
          {promoError && <span className="promo-error">{promoError}</span>}
          {promoDiscount > 0 && <span className="promo-success">{lang === 'ar' ? `تم تطبيق خصم ${formatMoney(promoDiscount, currency, lang)}` : `${formatMoney(promoDiscount, currency, lang)} discount applied`}</span>}
        </div>
        <div className="promo-section">
          <label className="promo-label"><Users size={14} /> {lang === 'ar' ? 'كود الإحالة (اختياري)' : 'Referral code (optional)'}</label>
          <div className="promo-input-row">
            <input className="promo-input" value={referralCode} onChange={(e) => { setReferralCode(e.target.value); setReferralError(''); setReferralCredit(0); }} placeholder={lang === 'ar' ? 'أدخل كود الإحالة' : 'Enter referral code'} maxLength={20} />
            <button className="promo-apply-btn" type="button" onClick={applyReferral} disabled={!referralCode.trim()}>{lang === 'ar' ? 'تطبيق' : 'Apply'}</button>
          </div>
          {referralError && <span className="promo-error">{referralError}</span>}
          {referralCredit > 0 && <span className="promo-success">{lang === 'ar' ? `تم إضافة ${formatMoney(referralCredit, currency, lang)} رصيد إحالة` : `${formatMoney(referralCredit, currency, lang)} referral credit applied`}</span>}
        </div>
      </div>
    );
  }

  // Step 3 — Payment (all non-onsite)
  function renderPaymentStep() {
    if (step !== 3 || isOnsite) return null;
    return (
      <div className="modal-wizard-content">
        <div className="modal-wizard-icon"><CreditCard size={28} /></div>
        <h3>{isQuiz ? (lang === 'ar' ? 'دفع المبلغ' : 'Pay Amount') : (lang === 'ar' ? 'دفع المقدم' : 'Pay Deposit')}</h3>
        <div className="deposit-highlight">
          <strong dir="ltr">{formatMoney(depositAmount, currency, lang)} {isInternational ? 'USDT' : currency}</strong>
          <small>{isQuiz ? (lang === 'ar' ? 'مبلغ الحل الكامل' : 'Full solve amount') : (lang === 'ar' ? 'مقدم — والباقي بعد المراجعة' : 'Deposit — remaining after review')}</small>
        </div>
        <label className="form-field payment-select-field">
          <span>{text.choosePayment}</span>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="">— {lang === 'ar' ? 'اختار طريقة الدفع' : 'Select payment method'} —</option>
            {branchPayments.map((m) => <option key={m.id} value={m.id}>{m.icon} {lang === 'ar' ? m.labelAr : m.label}</option>)}
          </select>
        </label>
        <label className="tma-dropzone-inline">
          <input type="file" accept=".jpg,.jpeg,.png,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size <= 5 * 1024 * 1024) setDepositProof(f); }} />
          {depositProof ? (
            <div className="wizard-file-info"><FileText size={18} /><span>{depositProof.name}</span><button type="button" className="wizard-file-remove" onClick={(e) => { e.stopPropagation(); setDepositProof(null); }}><X size={14} /></button></div>
          ) : (
            <><Upload size={18} /><span>{lang === 'ar' ? 'ارفع إثبات الدفع (صورة/سكرينشوت)' : 'Upload payment proof (screenshot)'}</span></>
          )}
        </label>
        {paymentMethod && branchPayments.find(m => m.id === paymentMethod)?.group === 'crypto' && (
          <label className="form-field">
            <span>Transaction Hash</span>
            <input value={depositTxHash} onChange={(e) => setDepositTxHash(e.target.value)} maxLength={128} placeholder="0x..." dir="ltr" />
          </label>
        )}
      </div>
    );
  }

  function renderModalActions() {
    if (success) return null;
    return (
      <div className="modal-wizard-actions">
        <button className="secondary-button" type="button" onClick={step === 0 ? onClose : () => setStep(step - 1)} disabled={sending}>
          {step === 0 ? text.cancel : <><ChevronLeft size={16} />{lang === 'ar' ? 'رجوع' : 'Back'}</>}
        </button>
        <div style={{ flex: 1 }} />
        {step < steps.length - 1 ? (
          <button className="primary-button modal-primary" type="button" onClick={handleNext} disabled={!canNext()}>
            {lang === 'ar' ? 'التالي' : 'Next'}<ChevronRight size={16} />
          </button>
        ) : (
          <button className="primary-button modal-primary" type="button" onClick={handleSubmit} disabled={sending || !contact.trim()}>
            {sending ? text.submitting : text.submit}
          </button>
        )}
      </div>
    );
  }

  // LMS Confirmation Dialog
  if (showLmsConfirm) {
    return (
      <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowLmsConfirm(false); }}>
        <section className="order-modal order-modal-v4 lms-confirm-modal" role="dialog" aria-modal="true">
          <button className="modal-close" type="button" onClick={() => setShowLmsConfirm(false)}><X size={18} /></button>
          <div className="lms-confirm-content">
            <div className="lms-confirm-icon"><Shield size={36} /></div>
            <h3>{lang === 'ar' ? 'تأكيد بيانات LMS' : 'Confirm LMS Data'}</h3>

            <div className="lms-confirm-branch">
              <span>{lang === 'ar' ? 'الفرع المختار:' : 'Selected branch:'}</span>
              <strong>{effectiveBranch.flag} {effectiveBranch.name[lang]}</strong>
            </div>

            <div className="lms-confirm-summary">
              <div className="lms-confirm-row">
                <span>{lang === 'ar' ? 'المادة' : 'Course'}</span>
                <strong dir="ltr">{course!.code}</strong>
              </div>
              <div className="lms-confirm-row">
                <span>{lang === 'ar' ? 'اسم المستخدم' : 'Username'}</span>
                <strong dir="ltr">{lmsUsername}</strong>
              </div>
              <div className="lms-confirm-row">
                <span>{lang === 'ar' ? 'كلمة المرور' : 'Password'}</span>
                <strong dir="ltr">{'•'.repeat(lmsPassword.length)}</strong>
              </div>
              <div className="lms-confirm-row">
                <span>{lang === 'ar' ? 'السعر' : 'Price'}</span>
                <strong dir="ltr">{formatMoney(basePrice, currency, lang)} {currency}</strong>
              </div>
            </div>

            <div className="lms-confirm-privacy">
              <Lock size={16} />
              <div>
                <strong>{lang === 'ar' ? 'خصوصيتك محمية' : 'Your privacy is protected'}</strong>
                <span>{lang === 'ar' ? 'بياناتك مش بتتجمع أو بتتخزن. بتتستخدم مرة واحدة لحل الكويز وبتمس فوراً. مفيش حد عنده صلاحية يشوفها غير فريق الحل المكلف بالطلب ده.' : 'Your data is NOT collected or stored. It\'s used once to solve the quiz and deleted immediately. No one else can access it except the assigned solver.'}</span>
              </div>
            </div>

            <div className="lms-confirm-warn">
              <AlertTriangle size={14} />
              <span>{lang === 'ar' ? 'تأكد إن البيانات صحيحة — لو غلط مش هنقدر ننفّذ ومش هيرجّع الفلوس' : 'Make sure data is correct — wrong data means no execution and no refund'}</span>
            </div>

            <div className="lms-confirm-actions">
              <button className="secondary-button" type="button" onClick={() => setShowLmsConfirm(false)}>
                {lang === 'ar' ? 'رجوع وتعديل' : 'Go back & edit'}
              </button>
              <button className="primary-button modal-primary" type="button" onClick={handleLmsConfirm}>
                <CheckCircle2 size={16} /> {lang === 'ar' ? 'أكد ومثّل' : 'Confirm & proceed'}
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (success) {
    return (
      <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <section className="order-modal order-modal-v4" role="dialog" aria-modal="true">
          <button className="modal-close" type="button" onClick={onClose}><X size={18} /></button>
          <div className="modal-success-state">
            <div className="success-checkmark"><CheckCircle2 size={48} /></div>
            <h2>{isOnsite ? text.claimSuccess : text.orderSuccess}</h2>
            <p>{isOnsite ? text.claimSuccessCopy : text.orderSuccessCopy}</p>
            <div className="order-id-box"><span>{text.orderId}</span><strong dir="ltr">{success.order_id}</strong></div>
            <div className="deposit-info-box">
              <CircleDollarSign size={16} />
              <span>{lang === 'ar' ? `ادفع ${formatMoney(success.deposit_amount, currency, lang)} ${currency} — فريقنا هيتواصل معاك` : `Pay ${formatMoney(success.deposit_amount, currency, lang)} — our team will contact you`}</span>
            </div>
            <button className="primary-button modal-primary" type="button" onClick={onClose}>{text.close}</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !sending) onClose(); }}>
      <section className={`order-modal order-modal-v4 order-modal-wizard ${isOnsite ? 'order-modal-onsite' : ''}`} role="dialog" aria-modal="true" aria-labelledby="order-title">
        <button className="modal-close" type="button" onClick={onClose} disabled={sending}><X size={18} /></button>

        <div className="modal-wizard-header">
          <span className="modal-eyebrow">{course.code} · {course.semester}</span>
          <h2 id="order-title">{isOnsite ? text.claimTitle : text.requestTitle}</h2>
          <div className="order-summary-mini">
            <span className="summary-course-icon"><CourseIcon name={course.icon} size={18} /></span>
            <div className="summary-course-copy">
              <span dir="ltr">{course.code}</span>
              <small>{course.title || text.titleUnavailable}</small>
            </div>
            {!isOnsite && step >= 2 && (
              <div className="summary-price-mini">
                <strong dir="ltr">{formatMoney(isQuiz ? basePrice : finalPrice, currency, lang)} <em>{isInternational ? 'USDT' : currency}</em></strong>
              </div>
            )}
          </div>
        </div>

        <div className="modal-wizard-progress">
          {steps.map((s, i) => (
            <div key={i} className={`mstep ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="mstep-circle">{i < step ? <CheckCircle2 size={14} /> : s.icon}</div>
              <span className="mstep-label">{lang === 'ar' ? s.labelAr : s.labelEn}</span>
              {i < steps.length - 1 && <div className={`mstep-line ${i < step ? 'filled' : ''}`} />}
            </div>
          ))}
        </div>

        {renderStepContent()}
        {renderPaymentStep()}

        {error && <p className="form-error modal-form-error" role="alert">{error}</p>}

        {renderModalActions()}
      </section>
    </div>
  );
}
