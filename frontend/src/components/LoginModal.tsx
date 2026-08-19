import { memo, useState } from 'react';
import { X, Mail, Lock, User, Loader2, AlertCircle, ArrowRight, UserX } from 'lucide-react';
import { useAuth } from '../lib/auth';

type Props = { open: boolean; onClose: () => void; lang: 'ar' | 'en' };

export const LoginModal = memo(function LoginModal({ open, onClose, lang }: Props) {
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    setError('');
    setSending(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      onClose();
      resetForm();
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg === 'email_already_registered') setError(lang === 'ar' ? 'البريد الإلكتروني مسجل بالفعل' : 'Email already registered');
      else if (msg === 'invalid_credentials') setError(lang === 'ar' ? 'البريد أو كلمة السر غير صحيحة' : 'Invalid email or password');
      else setError(lang === 'ar' ? 'حدث خطأ، يرجى المحاولة مرة أخرى' : 'Something went wrong, try again');
    } finally { setSending(false); }
  }

  function handleGoogleLogin() {
    const mockEmail = `user${Date.now()}@gmail.com`;
    const mockName = lang === 'ar' ? 'مستخدم جوجل' : 'Google User';
    loginWithGoogle('mock-google-token-' + Date.now(), mockName, mockEmail)
      .then(() => { onClose(); resetForm(); })
      .catch(() => setError(lang === 'ar' ? 'حدث خطأ في تسجيل الدخول بجوجل' : 'Google login failed'));
  }

  function handleGuest() {
    onClose();
    resetForm();
  }

  function resetForm() { setName(''); setEmail(''); setPassword(''); setError(''); }

  const t = {
    loginTitle: lang === 'ar' ? 'مرحبًا بعودتك' : 'Welcome back',
    registerTitle: lang === 'ar' ? 'إنشاء حساب جديد' : 'Create your account',
    loginSubtitle: lang === 'ar' ? 'سجل دخولك لتتابع طلباتك وتحصل على رصيد الإحالة' : 'Sign in to track your orders and earn referral credits',
    registerSubtitle: lang === 'ar' ? 'أنشئ حسابك واحصل على كود إحالة وخصومات حصرية' : 'Create your account for referral codes and exclusive discounts',
    name: lang === 'ar' ? 'الاسم الكامل' : 'Full name',
    email: lang === 'ar' ? 'البريد الإلكتروني' : 'Email address',
    password: lang === 'ar' ? 'كلمة المرور' : 'Password',
    submit: mode === 'login' ? (lang === 'ar' ? 'تسجيل الدخول' : 'Sign In') : (lang === 'ar' ? 'إنشاء الحساب' : 'Create Account'),
    orContinue: lang === 'ar' ? 'أو' : 'OR',
    google: lang === 'ar' ? 'المتابعة بجوجل' : 'Continue with Google',
    guest: lang === 'ar' ? 'الكمال كضيف' : 'Continue as Guest',
    switchToRegister: lang === 'ar' ? 'ليس لديك حساب؟' : "Don't have an account?",
    switchToLogin: lang === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?',
    switchRegister: lang === 'ar' ? 'إنشاء حساب' : 'Create one',
    switchLogin: lang === 'ar' ? 'تسجيل الدخول' : 'Sign in',
    guestNote: lang === 'ar' ? 'الحساب المجاني يسمح لك بالطلب بدون سجل طلبات أو مزايا الإحالة' : 'Guest checkout available without order history or referral benefits',
    namePlaceholder: lang === 'ar' ? 'أدخل اسمك الكامل' : 'Enter your full name',
    emailPlaceholder: lang === 'ar' ? 'your@email.com' : 'your@email.com',
    passwordPlaceholder: lang === 'ar' ? '٦ أحرف على الأقل' : 'Min 6 characters',
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="auth-modal" role="dialog" aria-modal="true">
        <button className="modal-close" type="button" onClick={onClose}><X size={18} /></button>

        {/* Brand Header */}
        <div className="auth-brand">
          <span className="auth-logo">T</span>
          <h1 className="auth-brand-name">TMAly</h1>
        </div>

        <div className="auth-header">
          <h2>{mode === 'login' ? t.loginTitle : t.registerTitle}</h2>
          <p>{mode === 'login' ? t.loginSubtitle : t.registerSubtitle}</p>
        </div>

        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="auth-name">{t.name}</label>
              <div className="auth-input-wrap">
                <User size={16} />
                <input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} maxLength={80} autoFocus />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">{t.email}</label>
            <div className="auth-input-wrap">
              <Mail size={16} />
              <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} maxLength={120} autoFocus={mode === 'login'} />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">{t.password}</label>
            <div className="auth-input-wrap">
              <Lock size={16} />
              <input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.passwordPlaceholder} minLength={6} maxLength={100} />
            </div>
          </div>

          {error && (
            <div className="auth-error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <button className="primary-button auth-submit" type="submit" disabled={sending || !email || !password || (mode === 'register' && !name)}>
            {sending ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
            <span>{sending ? (lang === 'ar' ? 'جاري...' : 'Loading...') : t.submit}</span>
          </button>
        </form>

        <div className="auth-divider">
          <span>{t.orContinue}</span>
        </div>

        <div className="auth-social-buttons">
          <button className="google-btn" type="button" onClick={handleGoogleLogin}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            <span>{t.google}</span>
          </button>

          <button className="guest-btn" type="button" onClick={handleGuest}>
            <UserX size={16} />
            <span>{t.guest}</span>
          </button>
        </div>

        <div className="auth-switch">
          <span>{mode === 'login' ? t.switchToRegister : t.switchToLogin}</span>
          <button type="button" className="auth-switch-btn" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? t.switchRegister : t.switchLogin}
          </button>
        </div>

        <div className="auth-guest-note">
          <AlertCircle size={12} />
          <span>{t.guestNote}</span>
        </div>
      </section>
    </div>
  );
});
