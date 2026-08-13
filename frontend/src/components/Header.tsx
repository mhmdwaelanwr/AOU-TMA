import { Globe2, Moon, Sun } from 'lucide-react';
import type { CurrencyCode, Language, Theme } from '../types';
import { currencies } from '../lib/config';

type Props = {
  lang: Language;
  theme: Theme;
  currency: CurrencyCode;
  onLang: () => void;
  onTheme: () => void;
  onCurrencyFocus: () => void;
  text: Record<string, string>;
};

export function Header({ lang, theme, currency, onLang, onTheme, onCurrencyFocus, text }: Props) {
  const selected = currencies.find((item) => item.code === currency)!;
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="AOU TMA Hub home">
        <span className="brand-logo">A</span>
        <span className="brand-copy">
          <strong>AOU TMA Hub</strong>
          <small>{text.brandCaption}</small>
        </span>
      </a>

      <nav className="desktop-nav" aria-label="Primary navigation">
        <a className="nav-chip active" href="#catalog">{text.catalog}</a>
        <a className="nav-chip" href="#how-it-works">{text.how}</a>
        <a className="nav-chip" href="#support">{text.support}</a>
      </nav>

      <div className="header-actions">
        <button className="control-chip currency-control" type="button" onClick={onCurrencyFocus}>
          <span>{selected.flag}</span>
          <span>{currency} · {selected.country[lang]}</span>
        </button>
        <button className="control-chip icon-text" type="button" onClick={onLang} aria-label="Switch language">
          <Globe2 size={14} />
          <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
        </button>
        <button className="control-chip icon-only" type="button" onClick={onTheme} aria-label="Switch color theme">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}
