import { MapPin, Search } from 'lucide-react';
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
              id="course-search"
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder={text.searchPlaceholder}
              autoComplete="off"
            />
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
