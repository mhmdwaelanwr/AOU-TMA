import { Landmark, MapPin, Search, WalletCards } from 'lucide-react';
import type { Branch, CurrencyCode, Language } from '../types';

type Props = { lang:Language; branch:Branch; currency:CurrencyCode; query:string; rate:number; usdtRate:number|null; fxLoading:boolean; fxError:boolean; fxStatus:'fresh'|'stale'|'base'; text:Record<string,string>; onQuery:(value:string)=>void };

export function Hero({lang,branch,currency,query,rate,usdtRate,fxLoading,fxError,fxStatus,text,onQuery}:Props) {
  const decimals=['KWD','JOD','BHD','OMR'].includes(currency)?4:rate<0.1?4:2;
  const statusLabel=fxError?text.rateUnavailable:fxStatus==='stale'?text.staleRate:fxStatus==='base'?text.baseRate:text.liveRate;
  const international=branch.code!=='EG';
  return <section className="hero-section" id="top"><div className="hero-card">
    <div className="hero-copy"><span className="live-badge"><span className="status-dot"/>{text.liveFx}</span><h1><span>{text.title1}</span><span>{text.title2}</span></h1><p>{text.heroCopy}</p></div>
    <div className="search-panel search-panel-v5">
      <label className="search-field" htmlFor="course-search"><Search size={18}/><input id="course-search" value={query} onChange={e=>onQuery(e.target.value)} placeholder={text.searchPlaceholder} autoComplete="off"/></label>
      <div className="branch-snapshot"><div className="branch-snapshot-main"><span className="branch-snapshot-icon"><MapPin size={18}/></span><div><small>{text.selectedBranch}</small><strong>{branch.flag} {branch.branch[lang]}</strong></div></div><span className={`fx-status ${fxError?'error':fxStatus}`}><span className="status-dot"/>{statusLabel}</span></div>
      <div className="pricing-snapshot-grid" aria-live="polite"><div className="pricing-snapshot-item"><Landmark size={16}/><div><small>{text.localCurrency}</small><strong>{fxLoading?'…':`1 EGP = ${rate.toFixed(decimals)} ${currency}`}</strong></div></div><div className={`pricing-snapshot-item ${international?'accent':''}`}><WalletCards size={16}/><div><small>{international?text.internationalPaymentCurrency:text.paymentRule}</small><strong>{international?(fxLoading?'…':usdtRate?`1 EGP = ${usdtRate.toFixed(6)} USDT`:text.rateUnavailable):text.egyptLocalPayments}</strong></div></div></div>
    </div>
  </div></section>;
}
