import { lazy, Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';
import { AuthProvider } from './lib/auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { OrderModal } from './components/OrderModal';
import { LoginPage } from './components/LoginPage';
import { Toast, type ToastMessage } from './components/Toast';
import { useCourses } from './hooks/useCourses';
import { useFx } from './hooks/useFx';
import { usePayments } from './hooks/usePayments';
import { copy } from './lib/i18n';
import { branches, detectBranchByTimezone, getBranch, getCurrencyForBranch, isNonEgyptBranch } from './lib/config';
import type { Branch, BranchId, Course, CurrencyCode, Faculty, Language, Theme } from './types';

const Catalog = lazy(() => import('./components/Catalog').then(m => ({ default: m.Catalog })));
const Stats = lazy(() => import('./components/Stats').then(m => ({ default: m.Stats })));
const PaymentMethods = lazy(() => import('./components/PaymentMethods').then(m => ({ default: m.PaymentMethods })));
const HowItWorks = lazy(() => import('./components/HowItWorks').then(m => ({ default: m.HowItWorks })));
const Support = lazy(() => import('./components/Support').then(m => ({ default: m.Support })));
const Complaints = lazy(() => import('./components/Complaints').then(m => ({ default: m.Complaints })));
const Referral = lazy(() => import('./components/Referral').then(m => ({ default: m.Referral })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const OrderHistory = lazy(() => import('./components/OrderHistory').then(m => ({ default: m.OrderHistory })));
const StudentDashboard = lazy(() => import('./components/StudentDashboard').then(m => ({ default: m.StudentDashboard })));

function stored<T extends string>(key: string, fallback: T): T {
  return (window.localStorage.getItem(key) as T | null) || fallback;
}

function detectLanguage(): Language {
  // Check localStorage first (user override)
  const storedLang = window.localStorage.getItem('aou-lang');
  if (storedLang === 'ar' || storedLang === 'en') return storedLang;
  // Auto-detect from browser language
  const browserLang = navigator.language || (navigator as any).languages?.[0] || 'ar';
  return browserLang.startsWith('ar') ? 'ar' : 'en';
}

function getInitialTheme(): Theme {
  const stored_theme = stored<Theme | 'system'>('aou-theme', 'system');
  if (stored_theme === 'system' || !stored_theme) {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return stored_theme;
}

function AppInner() {
  const [lang, setLang] = useState<Language>(detectLanguage);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>(() => stored<'system' | 'light' | 'dark'>('aou-theme-mode', 'system'));
  const [branchId, setBranchId] = useState<BranchId>(() => stored<BranchId>('aou-branch', detectBranchByTimezone()));
  const [query, setQuery] = useState('');
  const [faculty, setFaculty] = useState<Faculty>('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showLoginPage, setShowLoginPage] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdmin, setShowAdmin] = useState(() => new URLSearchParams(window.location.search).get('admin') === '1');
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showTop, setShowTop] = useState(false);
  const currencyRef = useRef<HTMLSelectElement>(null);

  const showToast = useCallback((msg: string, ok?: boolean) => {
    setToast({ msg, ok });
  }, []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const branch: Branch = getBranch(branchId);
  const currency: CurrencyCode = getCurrencyForBranch(branchId);
  const isInternational = isNonEgyptBranch(branchId);

  const text = useMemo(() => copy[lang] as Record<string, string>, [lang]);
  const { courses, loading: coursesLoading, error: coursesError } = useCourses(query, faculty);
  const fx = useFx(currency);
  const payments = usePayments();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('aou-lang', lang);
  }, [lang]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('aou-theme', themeMode);
    localStorage.setItem('aou-theme-resolved', theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (themeMode === 'system') {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    if (themeMode === 'system') {
      setTheme(mq.matches ? 'dark' : 'light');
    } else {
      setTheme(themeMode);
    }
    return () => mq.removeEventListener('change', handler);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem('aou-branch', branchId);
  }, [branchId]);

  const handleThemeModeChange = (mode: 'system' | 'light' | 'dark') => {
    setThemeMode(mode);
    if (mode === 'system') {
      setTheme(window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } else {
      setTheme(mode);
    }
  };

  const hasFxForSelection = fx.currency === currency && !fx.error;
  const pricingCurrency: CurrencyCode = hasFxForSelection ? currency : 'EGP';
  const rate = hasFxForSelection ? fx.rate : 1;

  return (
    <div className="app-shell">
      <ErrorBoundary>
        {showLoginPage ? (
          <LoginPage lang={lang} onBack={() => setShowLoginPage(false)} onLoginSuccess={() => { setShowLoginPage(false); showToast(lang === 'ar' ? 'تم تسجيل الدخول بنجاح ✓' : 'Signed in successfully ✓', true); }} />
        ) : showDashboard ? (
          <Suspense fallback={<div className="order-history-loading"><span>{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span></div>}>
            <StudentDashboard lang={lang} text={text} onBack={() => setShowDashboard(false)} onToast={showToast} />
          </Suspense>
        ) : (
          <>
            <Header
              lang={lang}
              theme={theme}
              themeMode={themeMode}
              branch={branch}
              branches={branches}
              text={text}
              onLang={() => setLang((value) => value === 'ar' ? 'en' : 'ar')}
              onThemeMode={handleThemeModeChange}
              onBranch={setBranchId}
              onLogin={() => setShowLoginPage(true)}
              onDashboard={() => setShowDashboard(true)}
              onAdmin={() => setShowAdmin(v => !v)}
              showAdmin={showAdmin}
            />

            <main>
              <Hero
                lang={lang}
                branch={branch}
                query={query}
                rate={rate}
                fxLoading={fx.loading}
                fxError={fx.error}
                fxStatus={fx.status}
                isInternational={isInternational}
                text={text}
                onQuery={setQuery}
              />
              <div className="page-width">
                <Suspense fallback={<div className="stats-grid">{Array.from({ length: 4 }).map((_, i) => <div className="stat-card" key={i} />)}</div>}>
                  <Stats courseCount={840} text={text} />
                </Suspense>
                <Suspense fallback={<div className="course-grid">{Array.from({ length: 8 }).map((_, i) => <div className="course-card skeleton-card" key={i} />)}</div>}>
                  <Catalog
                    courses={courses}
                    loading={coursesLoading}
                    error={coursesError}
                    faculty={faculty}
                    lang={lang}
                    branch={branch}
                    currency={pricingCurrency}
                    rate={rate}
                    isInternational={isInternational}
                    text={text}
                    onFaculty={setFaculty}
                    onOrder={setSelectedCourse}
                  />
                </Suspense>
                <Suspense fallback={null}>
                  {!payments.loading && <PaymentMethods items={payments.items} lang={lang} isInternational={isInternational} text={text} />}
                </Suspense>
                <Suspense fallback={null}>
                  <HowItWorks text={text} />
                </Suspense>
                <Suspense fallback={null}>
                  <OrderHistory lang={lang} />
                </Suspense>
                <Suspense fallback={null}>
                  <Support text={text} />
                </Suspense>
                <Suspense fallback={null}>
                  <Referral lang={lang} text={text} />
                </Suspense>
                <Suspense fallback={null}>
                  <Complaints lang={lang} text={text} />
                </Suspense>
                {showAdmin && (
                  <Suspense fallback={null}>
                    <AdminDashboard lang={lang} text={text} />
                  </Suspense>
                )}
              </div>
            </main>

            <footer className="site-footer" id="support">
              <span>{text.footer}</span><span>{text.tech} · <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates by ExchangeRate-API</a></span>
            </footer>

            <button className={`back-to-top ${showTop ? 'visible' : ''}`} type="button" onClick={scrollToTop} aria-label="Back to top">
              <ArrowUp size={18} />
            </button>
          </>
        )}
      </ErrorBoundary>

      <OrderModal
        open={Boolean(selectedCourse)}
        course={selectedCourse}
        lang={lang}
        branch={branch}
        currency={pricingCurrency}
        rate={rate}
        isInternational={isInternational}
        text={text}
        paymentMethods={payments.items}
        onClose={() => setSelectedCourse(null)}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
