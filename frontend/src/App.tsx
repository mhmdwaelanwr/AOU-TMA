import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { OrderModal } from './components/OrderModal';
import { useCourses } from './hooks/useCourses';
import { useFx } from './hooks/useFx';
import { usePayments } from './hooks/usePayments';
import { copy } from './lib/i18n';
import type { Course, CurrencyCode, Faculty, Language, Theme } from './types';

const Catalog = lazy(() => import('./components/Catalog').then(m => ({ default: m.Catalog })));
const Stats = lazy(() => import('./components/Stats').then(m => ({ default: m.Stats })));
const PaymentMethods = lazy(() => import('./components/PaymentMethods').then(m => ({ default: m.PaymentMethods })));
const HowItWorks = lazy(() => import('./components/HowItWorks').then(m => ({ default: m.HowItWorks })));

function stored<T extends string>(key: string, fallback: T): T {
  return (window.localStorage.getItem(key) as T | null) || fallback;
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => stored('aou-lang', 'ar'));
  const [theme, setTheme] = useState<Theme>(() => stored('aou-theme', window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [currency, setCurrency] = useState<CurrencyCode>(() => stored('aou-currency', 'EGP'));
  const [query, setQuery] = useState('');
  const [faculty, setFaculty] = useState<Faculty>('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const currencyRef = useRef<HTMLSelectElement>(null);

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
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('aou-theme', theme);
  }, [theme]);

  useEffect(() => localStorage.setItem('aou-currency', currency), [currency]);

  const hasFxForSelection = fx.currency === currency && !fx.error;
  const pricingCurrency: CurrencyCode = hasFxForSelection ? currency : 'EGP';
  const rate = hasFxForSelection ? fx.rate : 1;

  return (
    <div className="app-shell">
      <Header
        lang={lang}
        theme={theme}
        currency={currency}
        text={text}
        onLang={() => setLang((value) => value === 'ar' ? 'en' : 'ar')}
        onTheme={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}
        onCurrencyFocus={() => { currencyRef.current?.focus(); currencyRef.current?.click(); }}
      />

      <main>
        <Hero
          lang={lang}
          currency={currency}
          query={query}
          rate={rate}
          fxLoading={fx.loading}
          fxError={fx.error}
          fxStatus={fx.status}
          text={text}
          onQuery={setQuery}
          onCurrency={setCurrency}
          currencyRef={currencyRef}
        />
        <div className="page-width">
          <Suspense fallback={<div className="stats-grid">{Array.from({ length: 4 }).map((_, i) => <div className="stat-card" key={i} />)}</div>}>
            <Stats courseCount={217} text={text} />
          </Suspense>
          <Suspense fallback={<div className="course-grid">{Array.from({ length: 8 }).map((_, i) => <div className="course-card skeleton-card" key={i} />)}</div>}>
            <Catalog
              courses={courses}
              loading={coursesLoading}
              error={coursesError}
              faculty={faculty}
              lang={lang}
              currency={pricingCurrency}
              rate={rate}
              text={text}
              onFaculty={setFaculty}
              onOrder={setSelectedCourse}
            />
          </Suspense>
          <Suspense fallback={null}>
            {!payments.loading && <PaymentMethods items={payments.items} lang={lang} text={text} />}
          </Suspense>
          <Suspense fallback={null}>
            <HowItWorks text={text} />
          </Suspense>
        </div>
      </main>

      <footer className="site-footer" id="support">
        <span>{text.footer}</span><span>{text.tech} · <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates by ExchangeRate-API</a></span>
      </footer>

      <OrderModal
        open={Boolean(selectedCourse)}
        course={selectedCourse}
        lang={lang}
        currency={pricingCurrency}
        rate={rate}
        text={text}
        paymentMethods={payments.items}
        onClose={() => setSelectedCourse(null)}
      />
    </div>
  );
}
