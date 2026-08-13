import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { OrderModal } from './components/OrderModal';
import { useBranch } from './hooks/useBranch';
import { useCourses } from './hooks/useCourses';
import { useFx } from './hooks/useFx';
import { usePayments } from './hooks/usePayments';
import { copy } from './lib/i18n';
import type { Course, Faculty, Language, Theme, ThemePreference } from './types';

const Catalog = lazy(() => import('./components/Catalog').then(m => ({ default:m.Catalog })));
const Stats = lazy(() => import('./components/Stats').then(m => ({ default:m.Stats })));
const PaymentMethods = lazy(() => import('./components/PaymentMethods').then(m => ({ default:m.PaymentMethods })));
const HowItWorks = lazy(() => import('./components/HowItWorks').then(m => ({ default:m.HowItWorks })));

function stored<T extends string>(key:string, fallback:T):T {
  return (window.localStorage.getItem(key) as T | null) || fallback;
}
function systemTheme():Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => stored('aou-lang','ar'));
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => stored('aou-theme-preference','system'));
  const [detectedTheme, setDetectedTheme] = useState<Theme>(() => systemTheme());
  const [query, setQuery] = useState('');
  const [faculty, setFaculty] = useState<Faculty>('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const { branch, setBranchCode } = useBranch();
  const text = useMemo(() => copy[lang] as Record<string,string>, [lang]);
  const { courses, loading:coursesLoading, error:coursesError } = useCourses(query, faculty);
  const fx = useFx(branch.currency);
  const payments = usePayments();
  const theme:Theme = themePreference === 'system' ? detectedTheme : themePreference;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event:MediaQueryListEvent) => setDetectedTheme(event.matches ? 'dark' : 'light');
    setDetectedTheme(media.matches ? 'dark' : 'light');
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('aou-lang', lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('aou-theme-preference', themePreference);
  }, [theme, themePreference]);

  const pricingCurrency = branch.currency;
  const rate = fx.currency === pricingCurrency && !fx.error ? fx.rate : pricingCurrency === 'EGP' ? 1 : fx.rate || 1;
  const usdtRate = Number.isFinite(fx.usdtRate) && Number(fx.usdtRate) > 0 ? Number(fx.usdtRate) : null;
  const visiblePayments = useMemo(
    () => payments.items.filter((item) => branch.code === 'EG' ? item.group !== 'crypto' : item.group === 'crypto'),
    [payments.items, branch.code],
  );
  const cycleTheme = () => setThemePreference((current) => current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system');

  return (
    <div className="app-shell">
      <Header lang={lang} theme={theme} themePreference={themePreference} branch={branch} text={text}
        onBranch={setBranchCode}
        onLang={() => setLang((value) => value === 'ar' ? 'en' : 'ar')}
        onTheme={cycleTheme} />

      <main>
        <Hero lang={lang} branch={branch} currency={pricingCurrency} query={query} rate={rate} usdtRate={usdtRate}
          fxLoading={fx.loading} fxError={fx.error} fxStatus={fx.status} text={text} onQuery={setQuery} />
        <div className="page-width">
          <Suspense fallback={<div className="stats-grid">{Array.from({length:4}).map((_,i)=><div className="stat-card" key={i}/>)}</div>}>
            <Stats courseCount={217} text={text} />
          </Suspense>
          <Suspense fallback={<div className="course-grid">{Array.from({length:8}).map((_,i)=><div className="course-card skeleton-card" key={i}/>)}</div>}>
            <Catalog courses={courses} loading={coursesLoading} error={coursesError} faculty={faculty} lang={lang}
              branch={branch} currency={pricingCurrency} rate={rate} usdtRate={usdtRate} text={text}
              onFaculty={setFaculty} onOrder={setSelectedCourse} />
          </Suspense>
          <Suspense fallback={null}>
            {!payments.loading && <PaymentMethods items={visiblePayments} lang={lang} text={text} />}
          </Suspense>
          <Suspense fallback={null}><HowItWorks text={text} /></Suspense>
        </div>
      </main>

      <footer className="site-footer" id="support">
        <span>{text.footer}</span>
        <span>{text.tech} · <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">FX by ExchangeRate-API</a> · <a href="https://www.coingecko.com" target="_blank" rel="noreferrer">USDT by CoinGecko</a></span>
      </footer>

      <OrderModal open={Boolean(selectedCourse)} course={selectedCourse} lang={lang} branch={branch}
        currency={pricingCurrency} rate={rate} usdtRate={usdtRate} text={text} paymentMethods={visiblePayments}
        onClose={() => setSelectedCourse(null)} />
    </div>
  );
}
