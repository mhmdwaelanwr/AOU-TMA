import { MapPin, Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Branch, Language } from '../types';

type Props = {
  lang: Language;
  branch: Branch;
  query: string;
  catalogOnly: boolean;
  rate: number;
  fxLoading: boolean;
  fxError: boolean;
  fxStatus: 'fresh' | 'stale' | 'base';
  isInternational: boolean;
  text: Record<string, string>;
  onQuery: (value: string) => void;
};

export function Hero({ lang, branch, query, catalogOnly, rate, fxLoading, fxError, fxStatus, isInternational, text, onQuery }: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <section className="hero-section" id="top">
      <div className="hero-card">
        <div className="hero-copy">
          <span className="hero-badge">{catalogOnly ? (lang === 'ar' ? 'دليل المقررات' : 'COURSE CATALOG') : text.liveFx}</span>
          {catalogOnly ? (
            <h1><span>{lang === 'ar' ? 'كل موادك' : 'Your courses'}</span><span>{lang === 'ar' ? 'في مكان واحد' : 'in one place'}</span></h1>
          ) : (
            <h1><span>{text.title1}</span><span>{text.title2}</span></h1>
          )}
          <p>{catalogOnly
            ? (lang === 'ar'
              ? 'ابحث عن مواد الجامعة العربية المفتوحة، وراجع وصف المقرر ومصدره الرسمي بدون حساب أو بيانات شخصية.'
              : 'Search Arab Open University courses and review descriptions and official sources without an account.')
            : text.heroCopy}</p>
        </div>

        <div className="search-panel">
          <label className="search-field" htmlFor="course-search">
            <Search size={18} />
            <input
              ref={searchRef}
              type="search"
              id="course-search"
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && query) {
                  event.preventDefault();
                  onQuery('');
                }
              }}
              placeholder={text.searchPlaceholder}
              aria-label={lang === 'ar' ? 'البحث في المقررات' : 'Search courses'}
              autoComplete="off"
            />
            {query ? (
              <button
                type="button"
                className="course-search-clear"
                onClick={() => {
                  onQuery('');
                  searchRef.current?.focus();
                }}
                aria-label={lang === 'ar' ? 'مسح البحث' : 'Clear search'}
              >
                <X size={16} aria-hidden="true" />
              </button>
            ) : <kbd className="course-search-shortcut" aria-hidden="true">/</kbd>}
          </label>

          <div className="branch-display">
            <div className="branch-display-row">
              <span className="branch-display-flag">{branch.flag}</span>
              <div className="branch-display-info">
                <span className="branch-display-name">{branch.name[lang]}</span>
                <span className="branch-display-city"><MapPin size={11} /> {branch.city[lang]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
