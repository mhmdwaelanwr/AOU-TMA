import { ChevronDown, Search } from 'lucide-react';
import type { RefObject } from 'react';
import { currencies } from '../lib/config';
import type { CurrencyCode, Language } from '../types';

type Props = {
  lang: Language;
  currency: CurrencyCode;
  query: string;
  rate: number;
  fxLoading: boolean;
  fxError: boolean;
  fxStatus: 'fresh' | 'stale' | 'base';
  text: Record<string, string>;
  onQuery: (value: string) => void;
  onCurrency: (value: CurrencyCode) => void;
  currencyRef: RefObject<HTMLSelectElement | null>;
};

export function Hero({ lang, currency, query, rate, fxLoading, fxError, fxStatus, text, onQuery, onCurrency, currencyRef }: Props) {
  const selected = currencies.find((item) => item.code === currency)!;
  const decimals = ['KWD', 'JOD', 'BHD', 'OMR'].includes(currency) ? 4 : rate < 0.1 ? 4 : 2;
  const statusLabel = fxError ? text.rateUnavailable : fxStatus === 'stale' ? text.staleRate : fxStatus === 'base' ? text.baseRate : text.liveRate;

  return (
    <section className="hero-section" id="top">
      <div className="hero-card">
        <div className="hero-copy">
          <span className="live-badge"><span className="status-dot" />{text.liveFx}</span>
          <h1><span>{text.title1}</span><span>{text.title2}</span></h1>
          <p>{text.heroCopy}</p>
        </div>

        <div className="search-panel">
          <label className="search-field" htmlFor="course-search">
            <Search size={18} />
            <input
              id="course-search"
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder={text.searchPlaceholder}
              autoComplete="off"
            />
          </label>

          <span className="field-label">{text.countryCurrency}</span>
          <div className="currency-field">
            <span className="currency-leading">{selected.flag}</span>
            <select
              ref={currencyRef}
              aria-label={text.countryCurrency}
              value={currency}
              onChange={(event) => onCurrency(event.target.value as CurrencyCode)}
            >
              {currencies.map((item) => (
                <option value={item.code} key={item.code}>
                  {item.country[lang]} · {item.code} — {item.name[lang]}
                </option>
              ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </div>

          <div className="fx-row" aria-live="polite">
            <span>{fxLoading ? '…' : `1 EGP = ${rate.toFixed(decimals)} ${currency}`}</span>
            <span className={`fx-status ${fxError ? 'error' : fxStatus}`}>
              <span className="status-dot" />{statusLabel}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
