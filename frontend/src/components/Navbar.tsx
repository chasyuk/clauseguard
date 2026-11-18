import React from 'react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export type PageView = 'home' | 'auditor' | 'reconcile' | 'builder';

interface NavbarProps {
  currentPage: PageView;
  onSelectPage: (page: PageView) => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenPricing: () => void;
  freeAuditsRemaining?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onSelectPage,
  onOpenAuth,
  onOpenPricing,
  freeAuditsRemaining = 3,
}) => {
  const { lang, setLang, t } = useLanguage();
  const { user, logout } = useAuth();
  const isUk = lang === 'uk';

  const navItems = [
    { id: 'home' as const, label: isUk ? 'Головна' : 'Home', mobileLabel: isUk ? 'Головна' : 'Home' },
    { id: 'auditor' as const, label: isUk ? 'Аудит договору' : 'Audit', mobileLabel: isUk ? 'Аудит' : 'Audit' },
    { id: 'reconcile' as const, label: isUk ? 'Звірка з чатом' : 'Chat vs SOW', mobileLabel: isUk ? 'Звірка' : 'Chat SOW' },
    {
      id: 'builder' as const,
      label: isUk ? 'Зібрати договір' : 'Contract builder',
      mobileLabel: isUk ? 'Конструктор' : 'Builder',
      isPro: true,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-forest-border bg-forest/95 text-white backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-6">
        {/* Left: § clauseguard mark */}
        <button
          type="button"
          onClick={() => onSelectPage('home')}
          className="flex shrink-0 items-center gap-1.5 text-white transition-opacity hover:opacity-90 sm:gap-2.5"
          aria-label="ClauseGuard Home"
        >
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-signal font-mono text-xs font-bold text-white sm:h-7 sm:w-7 sm:text-sm"
            aria-hidden="true"
          >
            §
          </span>
          <span className="font-display text-base font-extrabold tracking-tight sm:text-lg">
            <span className="text-white">clause</span>
            <span className="text-signal">guard</span>
          </span>
        </button>

        {/* Center: Desktop Navigation Tabs */}
        <nav className="hidden items-center gap-1 rounded-full border border-forest-border bg-forest-deep p-1 md:flex" aria-label="Main Navigation">
          {navItems.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectPage(item.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-signal text-white shadow-sm'
                    : 'text-forest-muted hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {item.isPro && (
                  <span
                    className={`rounded px-1 py-0.2 text-[9px] font-extrabold ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                    }`}
                  >
                    PRO
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right actions: Lang switcher, Pricing/Pro, Auth */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* UA / EN pill toggle */}
          <div
            className="inline-flex shrink-0 items-center rounded-full border border-forest-border bg-forest-deep p-0.5"
            role="group"
            aria-label="Language switcher"
          >
            <button
              type="button"
              onClick={() => setLang('uk')}
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold transition-colors sm:px-2.5 sm:py-1 sm:text-[11px] ${
                lang === 'uk' ? 'bg-white text-forest' : 'text-forest-muted hover:text-white'
              }`}
            >
              UA
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold transition-colors sm:px-2.5 sm:py-1 sm:text-[11px] ${
                lang === 'en' ? 'bg-white text-forest' : 'text-forest-muted hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* Pricing Button */}
          <button
            type="button"
            onClick={onOpenPricing}
            className="inline-flex items-center gap-1 rounded-full border border-forest-border bg-forest-deep px-3 py-1.5 text-xs font-semibold text-white/90 transition-colors hover:border-amber-400/40 hover:text-amber-200"
          >
            <Sparkles className="h-3 w-3 text-signal" />
            <span>{isUk ? 'Тарифи' : 'Pricing'}</span>
          </button>

          {user ? (
            <div className="flex items-center gap-1.5 border-l border-forest-border pl-1.5 sm:gap-2 sm:pl-2.5">
              <div className="hidden flex-col items-end sm:flex">
                <span className="max-w-[120px] truncate font-mono text-xs font-medium text-white/90">
                  {user.name && !user.name.includes('@') ? user.name : user.email.split('@')[0]}
                </span>
                <span className="font-mono text-[10px] text-forest-muted">
                  {freeAuditsRemaining > 0
                    ? `${freeAuditsRemaining}/3 ${isUk ? 'безкоштовно' : 'free'}`
                    : 'Pro'}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-forest-border px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-forest-soft sm:px-3 sm:py-1.5 sm:text-xs"
              >
                {t.nav.signOut}
              </button>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-1 border-l border-forest-border pl-1.5 sm:gap-1.5 sm:pl-2.5">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="rounded-full px-2 py-1 text-[11px] font-medium text-forest-muted transition-colors hover:text-white sm:px-2.5 sm:py-1.5 sm:text-xs"
              >
                {t.nav.signIn}
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="rounded-full bg-signal px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-signal-hover sm:px-3.5 sm:py-1.5 sm:text-xs"
              >
                {t.nav.signUp}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sub-navigation bar (4 clean tabs, 1 row) */}
      <div className="border-t border-forest-border/60 bg-forest-deep/90 px-3 py-1.5 md:hidden">
        <nav className="grid grid-cols-4 gap-1 text-center" aria-label="Mobile Navigation">
          {navItems.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectPage(item.id)}
                className={`truncate rounded-md py-1.5 text-[11px] font-semibold transition-colors ${
                  active
                    ? 'bg-signal text-white'
                    : 'text-forest-muted hover:text-white'
                }`}
              >
                <span>{item.mobileLabel}</span>
                {item.isPro && (
                  <span className="ml-0.5 text-[8px] font-extrabold text-amber-300">★</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
