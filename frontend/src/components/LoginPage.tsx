import { memo, useState, useEffect } from 'react';
import { Mail, Lock, User, Loader2, AlertCircle, ArrowRight, UserX, GraduationCap, BookOpen, Target, ArrowLeft, Eye, EyeOff, CheckCircle2, Zap, Clock, Shield } from 'lucide-react';
import { useAuth } from '../lib/auth';
import type { Language } from '../types';

type Props = {
  lang: Language;
  onBack: () => void;
  onLoginSuccess: () => void;
};

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: 'weak', color: 'var(--danger)' };
  if (score <= 3) return { score, label: 'medium', color: 'var(--warning)' };
  return { score, label: 'strong', color: 'var(--success-primary)' };
}

export const LoginPage = memo(function LoginPage({ lang, onBack, onLoginSuccess }: Props) {
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const pwStrength = getPasswordStrength(password);

  const t = {
    welcome: lang === 'ar' ? 'أهلًا بك' : 'Welcome',
    wave: '👋',
    subtitle: lang === 'ar' ? 'سجّل دخولك أو أنشئ حسابك الجديد للمتابعة.' : 'Sign in or create a new account to continue.',
    loginTab: lang === 'ar' ? 'تسجيل الدخول' : 'Sign In',
    registerTab: lang === 'ar' ? 'حساب جديد' : 'Create Account',
    firstName: lang === 'ar' ? 'الاسم الأول' : 'First Name',
    lastName: lang === 'ar' ? 'اسم العائلة' : 'Last Name',
    email: lang === 'ar' ? 'البريد الجامعي أو رقم الطالب' : 'University Email or Student ID',
    password: lang === 'ar' ? 'كلمة المرور' : 'Password',
    rememberMe: lang === 'ar' ? 'تذكرني' : 'Remember me',
    forgotPassword: lang === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?',
    submitLogin: lang === 'ar' ? 'دخول إلى حسابي' : 'Sign In',
    submitRegister: lang === 'ar' ? 'إنشاء حساب مجاني' : 'Create Free Account',
    orContinue: lang === 'ar' ? 'أو' : 'OR',
    google: lang === 'ar' ? 'المتابعة بجوجل' : 'Continue with Google',
    guest: lang === 'ar' ? 'المتابعة كضيف' : 'Continue as Guest',
    switchToRegister: lang === 'ar' ? 'مش عندك حساب؟' : "Don't have an account?",
    switchToLogin: lang === 'ar' ? 'عندك حساب؟' : 'Already have an account?',
    switchRegister: lang === 'ar' ? 'أنشئ حساب جديد' : 'Create one',
    switchLogin: lang === 'ar' ? 'سجّل دخولك' : 'Sign in',
    guestNote: lang === 'ar' ? 'الحساب المجاني يسمح لك بالطلب بدون سجل طلبات أو مزايا الإحالة' : 'Guest checkout available without order history or referral benefits',
    emailPlaceholder: lang === 'ar' ? 'student@univ.edu' : 'student@univ.edu',
    passwordPlaceholder: lang === 'ar' ? '٦ أحرف على الأقل' : 'Min 6 characters',
    quote: lang === 'ar' ? '«التعليم مش بس قراءة… التعليم هو الفهم اللي يحوّل المعرفة لدرجات»' : '"Education is not just reading... it\'s the understanding that transforms knowledge into grades"',
    quoteAuthor: lang === 'ar' ? '— أكتر من 2,400 طالب بيواجهوا واجباتهم معانا بنجاح' : '— Over 2,400 students complete their assignments with us successfully',
    statStudents: lang === 'ar' ? 'طالب مستفاد' : 'Students',
    statAssignments: lang === 'ar' ? 'واجب محلول' : 'Assignments',
    statRating: lang === 'ar' ? 'تقييم الطلبة' : 'Student Rating',
    backToHome: lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home',
    terms: lang === 'ar' ? 'شروط الاستخدام' : 'Terms of Service',
    agreeTo: lang === 'ar' ? 'أوافق على' : 'I agree to',
    pwWeak: lang === 'ar' ? 'ضعيفة' : 'Weak',
    pwMedium: lang === 'ar' ? 'متوسطة' : 'Medium',
    pwStrong: lang === 'ar' ? 'قوية' : 'Strong',
    feature1Title: lang === 'ar' ? 'حل خطوة بخطوة' : 'Step-by-step solutions',
    feature1Desc: lang === 'ar' ? 'شرح وتفصيل لكل جزئية في الواجب' : 'Detailed explanation for every part',
    feature2Title: lang === 'ar' ? 'نماذج إجابات' : 'Answer models',
    feature2Desc: lang === 'ar' ? 'بنوك نماذج معتمدة من كل مادة' : 'Verified models from every course',
    feature3Title: lang === 'ar' ? 'تنبيهات المواعيد' : 'Deadline alerts',
    feature3Desc: lang === 'ar' ? 'نذكّرَك بكل موعد تسليم قبلها بوقت كافي' : 'Remind you before every due date',
    feature4Title: lang === 'ar' ? 'نتائج سريعة' : 'Fast results',
    feature4Desc: lang === 'ar' ? 'متوسط تسليم الواجب في يوم واحد فقط' : 'Average delivery in just one day',
  };

  async function handleSubmit() {
    setError('');
    setSending(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        const fullName = `${firstName} ${lastName}`.trim();
        await register(fullName || email.split('@')[0], email, password);
      }
      onLoginSuccess();
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
      .then(() => { onLoginSuccess(); resetForm(); })
      .catch(() => setError(lang === 'ar' ? 'حدث خطأ في تسجيل الدخول بجوجل' : 'Google login failed'));
  }

  function handleGuest() { onLoginSuccess(); resetForm(); }
  function resetForm() { setFirstName(''); setLastName(''); setEmail(''); setPassword(''); setError(''); }

  return (
    <div className={`lp-wrap ${mounted ? 'lp-mounted' : ''}`}>
      {/* ── Aside Panel ── */}
      <aside className="lp-side">
        <div className="lp-side-bg" />

        <button className="lp-back" onClick={onBack} type="button">
          <ArrowLeft size={16} />
          <span>{t.backToHome}</span>
        </button>

        <div className="lp-brand">
          <span className="lp-brand-logo">T</span>
          <span className="lp-brand-name">TMAly</span>
        </div>

        <div className="lp-quote">
          <p>{t.quote}</p>
          <span>{t.quoteAuthor}</span>
        </div>

        <div className="lp-features">
          {[
            { icon: <Zap size={16} />, title: t.feature1Title, desc: t.feature1Desc },
            { icon: <BookOpen size={16} />, title: t.feature2Title, desc: t.feature2Desc },
            { icon: <Clock size={16} />, title: t.feature3Title, desc: t.feature3Desc },
            { icon: <Shield size={16} />, title: t.feature4Title, desc: t.feature4Desc },
          ].map((f, i) => (
            <div className="lp-feature-item" key={i} style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
              <div className="lp-feature-icon">{f.icon}</div>
              <div>
                <strong>{f.title}</strong>
                <span>{f.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="lp-mini-stats">
          <div className="lp-mini-stat">
            <GraduationCap size={18} />
            <div><strong>+2,400</strong><span>{t.statStudents}</span></div>
          </div>
          <div className="lp-mini-stat">
            <BookOpen size={18} />
            <div><strong>+1,800</strong><span>{t.statAssignments}</span></div>
          </div>
          <div className="lp-mini-stat">
            <Target size={18} />
            <div><strong>4.9/5</strong><span>{t.statRating}</span></div>
          </div>
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <main className="lp-main">
        <div className="lp-brand-mobile">
          <span className="lp-brand-logo">T</span>
          <span className="lp-brand-name">TMAly</span>
        </div>

        <div className="lp-box">
          <h1 className="lp-title">{t.welcome} <span className="lp-wave">{t.wave}</span></h1>
          <p className="lp-subtitle">{t.subtitle}</p>

          <div className="lp-tabs">
            <button
              className={`lp-tab ${mode === 'login' ? 'lp-tab-active' : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
              type="button"
            >
              {t.loginTab}
            </button>
            <button
              className={`lp-tab ${mode === 'register' ? 'lp-tab-active' : ''}`}
              onClick={() => { setMode('register'); setError(''); }}
              type="button"
            >
              {t.registerTab}
            </button>
          </div>

          <form className="lp-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            {mode === 'register' && (
              <div className="lp-field-row lp-fade-in">
                <div className="lp-field">
                  <label>{t.firstName}</label>
                  <div className="lp-input-wrap">
                    <User size={16} />
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={lang === 'ar' ? 'الاسم' : 'First name'} maxLength={40} autoFocus />
                  </div>
                </div>
                <div className="lp-field">
                  <label>{t.lastName}</label>
                  <div className="lp-input-wrap">
                    <User size={16} />
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={lang === 'ar' ? 'العائلة' : 'Last name'} maxLength={40} />
                  </div>
                </div>
              </div>
            )}

            <div className="lp-field">
              <label>{t.email}</label>
              <div className="lp-input-wrap">
                <Mail size={16} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} maxLength={120} autoFocus={mode === 'login'} required />
              </div>
            </div>

            <div className="lp-field">
              <label>{t.password}</label>
              <div className="lp-input-wrap">
                <Lock size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  minLength={6}
                  maxLength={100}
                  required
                />
                <button
                  type="button"
                  className="lp-pw-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'register' && password.length > 0 && (
              <div className="lp-pw-strength lp-fade-in">
                <div className="lp-pw-bar">
                  <div className="lp-pw-fill" style={{ width: `${(pwStrength.score / 5) * 100}%`, background: pwStrength.color }} />
                </div>
                <span style={{ color: pwStrength.color }}>
                  {pwStrength.label === 'weak' ? t.pwWeak : pwStrength.label === 'medium' ? t.pwMedium : t.pwStrong}
                </span>
              </div>
            )}

            {mode === 'login' && (
              <div className="lp-check-row">
                <label className="lp-checkbox">
                  <input type="checkbox" defaultChecked />
                  <span>{t.rememberMe}</span>
                </label>
                <a href="#" className="lp-forgot" onClick={(e) => e.preventDefault()}>{t.forgotPassword}</a>
              </div>
            )}

            {mode === 'register' && (
              <div className="lp-check-row">
                <label className="lp-checkbox">
                  <input type="checkbox" required />
                  <span>{t.agreeTo} <a href="#" onClick={(e) => e.preventDefault()}>{t.terms}</a></span>
                </label>
              </div>
            )}

            {error && (
              <div className="lp-error lp-fade-in">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <button className="lp-submit" type="submit" disabled={sending || !email || !password || (mode === 'register' && !firstName)}>
              {sending ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
              <span>{sending ? (lang === 'ar' ? 'جاري...' : 'Loading...') : (mode === 'login' ? t.submitLogin : t.submitRegister)}</span>
            </button>
          </form>

          <div className="lp-divider">
            <span>{t.orContinue}</span>
          </div>

          <div className="lp-social">
            <button className="lp-google-btn" type="button" onClick={handleGoogleLogin}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              <span>{t.google}</span>
            </button>

            <button className="lp-guest-btn" type="button" onClick={handleGuest}>
              <UserX size={16} />
              <span>{t.guest}</span>
            </button>
          </div>

          <div className="lp-switch">
            <span>{mode === 'login' ? t.switchToRegister : t.switchToLogin}</span>
            <button type="button" className="lp-switch-btn" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? t.switchRegister : t.switchLogin}
            </button>
          </div>

          <div className="lp-guest-note">
            <AlertCircle size={12} />
            <span>{t.guestNote}</span>
          </div>
        </div>
      </main>
    </div>
  );
});
