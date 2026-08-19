import { ChevronDown, Globe2, Monitor, Moon, Sun, Menu, X, LogIn, User, LogOut, Package, LayoutDashboard, Shield } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Branch, BranchId, Language, Theme } from '../types';
import { useAuth } from '../lib/auth';

type Props = {
  lang: Language;
  theme: Theme;
  themeMode: 'system' | 'light' | 'dark';
  branch: Branch;
  branches: Branch[];
  text: Record<string, string>;
  onLang: () => void;
  onThemeMode: (mode: 'system' | 'light' | 'dark') => void;
  onBranch: (id: BranchId) => void;
  onLogin: () => void;
  onDashboard: () => void;
  onAdmin?: () => void;
  showAdmin?: boolean;
};

const NAV_ITEMS = [
  { id: 'catalog', labelKey: 'catalog' },
  { id: 'how-it-works', labelKey: 'how' },
  { id: 'complaints', labelKey: 'complaint' },
  { id: 'support-page', labelKey: 'support' },
] as const;

export function Header({ lang, theme, themeMode, branch, branches, text, onLang, onThemeMode, onBranch, onLogin, onDashboard, onAdmin, showAdmin }: Props) {
  const { user, logout, loading } = useAuth();
  const [showBranches, setShowBranches] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('catalog');
  const mobileRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-spy: track which section is visible
  useEffect(() => {
    const sections = NAV_ITEMS.map(item => document.getElementById(item.id)).filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );

    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!showMobile) return;
    const onClick = (e: MouseEvent) => {
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) setShowMobile(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showMobile]);

  useEffect(() => {
    if (!showUser) return;
    const onClick = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showUser]);

  useEffect(() => {
    document.body.classList.toggle('modal-open', showMobile);
    return () => { document.body.classList.remove('modal-open'); };
  }, [showMobile]);

  const handleNavClick = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    setShowMobile(false);
  }, []);

  return (
    <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
      <a className="brand" href="#top" aria-label="TMAly home">
        <img src="/tmaly-logo.svg" alt="TMAly" className="brand-logo-img" />
        <span className="brand-copy">
          <strong>TMAly</strong>
          <small>{text.brandCaption}</small>
        </span>
      </a>

      <nav className="desktop-nav" aria-label="Primary navigation">
        {NAV_ITEMS.map(item => (
          <a
            key={item.id}
            className={`nav-chip ${activeSection === item.id ? 'active' : ''}`}
            href={`#${item.id}`}
            onClick={() => handleNavClick(item.id)}
          >
            {text[item.labelKey]}
          </a>
        ))}
      </nav>

      <div className="header-actions">
        <div className="branch-selector-wrap">
          <button className="control-chip branch-control" type="button" onClick={() => { setShowBranches(!showBranches); setShowTheme(false); setShowUser(false); }}>
            <span>{branch.flag}</span>
            <span className="branch-label">{branch.name[lang]}</span>
            <ChevronDown size={12} />
          </button>
          {showBranches && (
            <div className="branch-dropdown">
              {branches.map((b) => (
                <button key={b.id} type="button" className={`branch-option ${b.id === branch.id ? 'active' : ''}`} onClick={() => { onBranch(b.id); setShowBranches(false); }}>
                  <span>{b.flag}</span>
                  <span>{b.name[lang]}</span>
                  <span className="branch-city">{b.city[lang]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="control-chip icon-text" type="button" onClick={onLang} aria-label="Switch language">
          <Globe2 size={14} />
          <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
        </button>

        <div className="theme-selector-wrap">
          <button className="control-chip icon-only" type="button" onClick={() => { setShowTheme(!showTheme); setShowBranches(false); setShowUser(false); }} aria-label="Switch color theme">
            {themeMode === 'system' ? <Monitor size={15} /> : theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {showTheme && (
            <div className="theme-dropdown">
              <button type="button" className={`theme-option ${themeMode === 'system' ? 'active' : ''}`} onClick={() => { onThemeMode('system'); setShowTheme(false); }}>
                <Monitor size={14} /><span>{text.themeSystem}</span>
              </button>
              <button type="button" className={`theme-option ${themeMode === 'light' ? 'active' : ''}`} onClick={() => { onThemeMode('light'); setShowTheme(false); }}>
                <Sun size={14} /><span>{text.themeLight}</span>
              </button>
              <button type="button" className={`theme-option ${themeMode === 'dark' ? 'active' : ''}`} onClick={() => { onThemeMode('dark'); setShowTheme(false); }}>
                <Moon size={14} /><span>{text.themeDark}</span>
              </button>
            </div>
          )}
        </div>

        {/* Auth Button */}
        {loading ? null : user ? (
          <div className="user-selector-wrap" ref={userRef}>
            <button className="control-chip user-control" type="button" onClick={() => { setShowUser(!showUser); setShowBranches(false); setShowTheme(false); }}>
              <span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span>
              <span className="user-name-label">{user.name.split(' ')[0]}</span>
              <ChevronDown size={12} />
            </button>
            {showUser && (
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  <span className="user-avatar-lg">{user.name.charAt(0).toUpperCase()}</span>
                  <div className="user-dropdown-info">
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                  </div>
                </div>
                <div className="user-dropdown-divider" />
                <a className="user-dropdown-item" href="#order-history" onClick={() => setShowUser(false)}>
                  <Package size={15} /><span>{lang === 'ar' ? 'طلباتي' : 'My Orders'}</span>
                </a>
                <button className="user-dropdown-item" type="button" onClick={() => { onDashboard(); setShowUser(false); }}>
                  <LayoutDashboard size={15} /><span>{lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
                </button>
                {onAdmin && (
                  <button className="user-dropdown-item" type="button" onClick={() => { onAdmin(); setShowUser(false); }}>
                    <Shield size={15} /><span>{showAdmin ? (lang === 'ar' ? 'إخفاء الإدارة' : 'Hide Admin') : (lang === 'ar' ? 'لوحة الإدارة' : 'Admin Panel')}</span>
                  </button>
                )}
                <button className="user-dropdown-item user-logout" type="button" onClick={() => { logout(); setShowUser(false); }}>
                  <LogOut size={15} /><span>{lang === 'ar' ? 'خروج' : 'Sign Out'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="control-chip icon-text auth-btn" type="button" onClick={onLogin}>
            <LogIn size={14} />
            <span>{lang === 'ar' ? 'دخول' : 'Sign In'}</span>
          </button>
        )}

        <button className="control-chip icon-only mobile-menu-btn" type="button" onClick={() => setShowMobile(!showMobile)} aria-label="Menu">
          {showMobile ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {showMobile && (
        <div className="mobile-nav-overlay" ref={mobileRef}>
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {NAV_ITEMS.map(item => (
              <a
                key={item.id}
                className={`mobile-nav-link ${activeSection === item.id ? 'active' : ''}`}
                href={`#${item.id}`}
                onClick={() => handleNavClick(item.id)}
              >
                {text[item.labelKey]}
              </a>
            ))}
            {user && <a className="mobile-nav-link" href="#order-history" onClick={() => handleNavClick('order-history')}>{lang === 'ar' ? 'طلباتي' : 'My Orders'}</a>}
            {user && <button className="mobile-nav-link" type="button" onClick={() => { onDashboard(); setShowMobile(false); }}><LayoutDashboard size={14} /> {lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</button>}
            {user && onAdmin && <button className="mobile-nav-link" type="button" onClick={() => { onAdmin(); setShowMobile(false); }}><Shield size={14} /> {showAdmin ? (lang === 'ar' ? 'إخفاء الإدارة' : 'Hide Admin') : (lang === 'ar' ? 'لوحة الإدارة' : 'Admin Panel')}</button>}
          </nav>
          <div className="mobile-nav-footer">
            <div className="mobile-nav-branch">
              <span>{lang === 'ar' ? 'الفرع' : 'Branch'}: {branch.flag} {branch.name[lang]}</span>
            </div>
            {user ? (
              <button className="primary-button mobile-auth-btn" type="button" onClick={() => { logout(); setShowMobile(false); }}>
                <LogOut size={15} /><span>{lang === 'ar' ? 'خروج' : 'Sign Out'}</span>
              </button>
            ) : (
              <button className="primary-button mobile-auth-btn" type="button" onClick={() => { onLogin(); setShowMobile(false); }}>
                <LogIn size={15} /><span>{lang === 'ar' ? 'تسجيل دخول' : 'Sign In'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
