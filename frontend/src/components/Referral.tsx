import { memo, useState, useEffect } from 'react';
import { Copy, CheckCircle2, Share2, Users, Gift, Wallet, Link2, Info } from 'lucide-react';
import type { Language } from '../types';
import { useAuth } from '../lib/auth';
import { API_URL } from '../lib/config';

type Props = { lang: Language; text: Record<string, string> };

export const Referral = memo(function Referral({ lang, text }: Props) {
  const { user, token } = useAuth();
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState<{ uses: number; credit: number; balance: number } | null>(null);

  useEffect(() => {
    if (!user || !token) {
      const stored = localStorage.getItem('aou-referral-code');
      if (stored) { setReferralCode(stored); return; }
      const code = 'AOU-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem('aou-referral-code', code);
      setReferralCode(code);
      return;
    }
    fetch(`${API_URL}/api/user/referral`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.ok) {
          setReferralCode(data.code);
          setStats({ uses: data.total_uses, credit: data.total_credit_given, balance: data.balance });
        }
      }).catch(() => {});
  }, [user, token]);

  function handleCopy() {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyLink() {
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  function handleShare() {
    const msg = lang === 'ar'
      ? `استخدم كود الإحالة ${referralCode} واحصل على 15 جنيه رصيد عند أول طلب من TMAly`
      : `Use referral code ${referralCode} and get 15 EGP credit on your first order from TMAly`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  return (
    <section className="referral-section" id="referral">
      <div className="referral-container">
        <p className="section-eyebrow">REFERRAL</p>
        <h2 className="referral-title">{text.referralTitle}</h2>
        <p className="referral-subtitle">{text.referralSubtitle}</p>

        <div className="referral-card">
          <div className="referral-code-row">
            <span className="referral-code-label">{text.referralCode}</span>
            <div className="referral-code-box">
              <strong dir="ltr">{referralCode || '…'}</strong>
              <button className="referral-copy-btn" onClick={handleCopy} type="button">
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                <span>{copied ? text.referralCopied : text.referralCopy}</span>
              </button>
            </div>
          </div>

          <div className="referral-link-row">
            <span className="referral-code-label">{lang === 'ar' ? 'رابط الإحالة' : 'Referral Link'}</span>
            <div className="referral-code-box">
              <small dir="ltr" className="referral-link-text">{`${window.location.origin}?ref=${referralCode}`}</small>
              <button className="referral-copy-btn" onClick={handleCopyLink} type="button">
                {linkCopied ? <CheckCircle2 size={14} /> : <Link2 size={14} />}
                <span>{linkCopied ? text.referralCopied : text.referralCopy}</span>
              </button>
            </div>
          </div>

          <div className="referral-perks">
            <div className="referral-perk">
              <div className="referral-perk-icon"><Gift size={18} /></div>
              <span className="referral-perk-amount">{lang === 'ar' ? 'إنت بتاخد' : 'You earn'} <strong>15 {lang === 'ar' ? 'جنيه' : 'EGP'}</strong> {lang === 'ar' ? 'رصيد' : 'credit'}</span>
              <small className="referral-perk-note">{lang === 'ar' ? 'لكل صديق' : 'per referral'}</small>
            </div>
            <div className="referral-perk">
              <div className="referral-perk-icon"><Users size={18} /></div>
              <span className="referral-perk-amount">{lang === 'ar' ? 'صديقك بيستفيد' : 'Your friend gets'} <strong>15 {lang === 'ar' ? 'جنيه' : 'EGP'}</strong> {lang === 'ar' ? 'رصيد' : 'credit'}</span>
              <small className="referral-perk-note">{lang === 'ar' ? 'أول طلب' : 'first order'}</small>
            </div>
          </div>

          {stats && stats.uses > 0 && (
            <div className="referral-stats">
              <span>{lang === 'ar' ? `استخدم الكود ${stats.uses} مرة` : `Used ${stats.uses} time${stats.uses > 1 ? 's' : ''}`}</span>
              <span>{lang === 'ar' ? `إجمالي رصيد: ${stats.credit} ج.م` : `Total credit: ${stats.credit} EGP`}</span>
            </div>
          )}

          {stats && stats.balance > 0 && (
            <div className="referral-balance">
              <Wallet size={16} />
              <span>{lang === 'ar' ? `رصيدك الحالي: ${stats.balance} ج.م` : `Your balance: ${stats.balance} EGP`}</span>
            </div>
          )}

          {stats && stats.balance > 0 && (
            <div className="referral-notice">
              <Info size={14} />
              <span>{lang === 'ar' ? 'الرصيد بيتم استخدامه تلقائيًا عند الطلب' : 'Balance is applied automatically during checkout'}</span>
            </div>
          )}

          <button className="primary-button referral-share-btn" onClick={handleShare}>
            <Share2 size={16} /><span>{text.referralShare}</span>
          </button>
        </div>
      </div>
    </section>
  );
});
