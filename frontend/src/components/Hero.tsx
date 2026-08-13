import { MapPin, Search, ShieldCheck, WalletCards } from 'lucide-react';
import { branchUiCopy } from '../lib/branchUiCopy';
import type { Branch, CurrencyCode, Language } from '../types';

type Props = { lang: Language; branch: Branch; currency: CurrencyCode; query: string; rate: number; usdtRate: number | null; fxLoading: boolean; fxError: boolean; fxStatus: 'fresh' | 'stale' | 'base'; text: Record<string, string>; onQuery: (value: string) => void };

export function Hero({ lang, branch, query, fxLoading, fxError, fxStatus, text, onQuery }: Props) {
  const ui = branchUiCopy[lang];
  const international = branch.code !== 'EG';
  const statusLabel = fxError ? ui.unavailable : fxLoading ? ui.loading : fxStatus === 'stale' ? ui.cached : ui.ready;
  return <section className="hero-section" id="top"><div className="hero-card">
    <div className="hero-copy"><span className="live-badge"><span className="status-dot"/>{ui.badge}</span><h1><span>{text.title1}</span><span>{ui.title}</span></h1><p>{ui.body}</p></div>
    <div className="search-panel search-panel-v5">
      <label className="search-field" htmlFor="course-search"><Search size={18}/><input id="course-search" value={query} onChange={event=>onQuery(event.target.value)} placeholder={text.searchPlaceholder} autoComplete="off"/></label>
      <div className="branch-snapshot"><div className="branch-snapshot-main"><span className="branch-snapshot-icon"><MapPin size={18}/></span><div><small>{text.selectedBranch}</small><strong>{branch.flag} {branch.branch[lang]}</strong></div></div><span className={`fx-status ${fxError?'error':fxStatus}`}><span className="status-dot"/>{statusLabel}</span></div>
      <div className="pricing-snapshot-grid" aria-live="polite"><div className="pricing-snapshot-item"><ShieldCheck size={16}/><div><small>{ui.experience}</small><strong>{ui.automatic}</strong></div></div><div className={`pricing-snapshot-item ${international?'accent':''}`}><WalletCards size={16}/><div><small>{ui.checkout}</small><strong>{international?ui.usdt:text.egyptLocalPayments}</strong></div></div></div>
    </div>
  </div></section>;
}
