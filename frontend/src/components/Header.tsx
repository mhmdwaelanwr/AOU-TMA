import { Globe2, Monitor, Moon, Sun } from 'lucide-react';
import { branches } from '../lib/config';
import type { Branch, BranchCode, Language, Theme, ThemePreference } from '../types';

type Props = {
  lang:Language; theme:Theme; themePreference:ThemePreference; branch:Branch;
  onBranch:(value:BranchCode)=>void; onLang:()=>void; onTheme:()=>void;
  text:Record<string,string>;
};

export function Header({ lang, theme, themePreference, branch, onBranch, onLang, onTheme, text }:Props) {
  const ThemeIcon = themePreference === 'system' ? Monitor : theme === 'dark' ? Sun : Moon;
  const themeLabel = themePreference === 'system' ? text.themeSystem : theme === 'dark' ? text.themeDark : text.themeLight;
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="AOU TMA Hub home">
        <span className="brand-logo">A</span>
        <span className="brand-copy"><strong>AOU TMA Hub</strong><small>{text.brandCaption}</small></span>
      </a>
      <nav className="desktop-nav" aria-label="Primary navigation">
        <a className="nav-chip active" href="#catalog">{text.catalog}</a>
        <a className="nav-chip" href="#how-it-works">{text.how}</a>
        <a className="nav-chip" href="#support">{text.support}</a>
      </nav>
      <div className="header-actions">
        <label className="control-chip branch-control">
          <span className="branch-control-flag" aria-hidden="true">{branch.flag}</span>
          <span className="branch-control-label">{text.branch}</span>
          <select value={branch.code} onChange={(event)=>onBranch(event.target.value as BranchCode)} aria-label={text.chooseBranch}>
            {branches.map((item)=><option key={item.code} value={item.code}>{item.flag} {item.branch[lang]}</option>)}
          </select>
        </label>
        <button className="control-chip icon-text" type="button" onClick={onLang} aria-label="Switch language">
          <Globe2 size={14}/><span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
        </button>
        <button className="control-chip icon-text theme-control" type="button" onClick={onTheme} aria-label={themeLabel} title={themeLabel}>
          <ThemeIcon size={15}/><span className="theme-label">{themePreference === 'system' ? text.auto : theme === 'dark' ? text.dark : text.light}</span>
        </button>
      </div>
    </header>
  );
}
