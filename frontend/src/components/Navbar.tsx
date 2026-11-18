import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export type WorkspaceMode = 'auditor' | 'reconcile' | 'builder';

interface NavbarProps {
  activeMode?: WorkspaceMode;
  onSelectMode?: (mode: WorkspaceMode) => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenDonate: () => void;
  showLandingAnchors?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onOpenDonate,
  showLandingAnchors = true,
}) => {
  const { lang, setLang, t } = useLanguage();
  const { user, logout } = useAuth();

  return (
    <header className="w-full border-b border-forest-border bg-forest text-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-6">
        {/* Left: § clauseguard mark */}
        <a
          href="/"
          className="flex shrink-0 items-center gap-1.5 text-white transition-opacity hover:opacity-90 sm:gap-2.5"
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
        </a>

        {/* Right navigation */}
        <div className="flex items-center gap-1.5 sm:gap-4">
          {showLandingAnchors && (
            <div className="hidden items-center gap-4 text-xs font-medium text-forest-muted lg:flex">
              <a href="#how-it-works" className="transition-colors hover:text-white">
                {lang === 'uk' ? 'Як це працює' : 'How it works'}
              </a>
              <a href="#privacy" className="transition-colors hover:text-white">
                {lang === 'uk' ? 'Приватність' : 'Privacy'}
              </a>
            </div>
          )}

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

          <button
            type="button"
            onClick={onOpenDonate}
            className="hidden rounded-full border border-forest-border px-3 py-1.5 text-xs font-medium text-forest-muted transition-colors hover:border-white/40 hover:text-white md:inline-flex"
          >
            {t.nav.donate}
          </button>

          {user ? (
            <div className="flex items-center gap-1.5 border-l border-forest-border pl-1.5 sm:gap-2 sm:pl-2.5">
              <span className="max-w-[96px] truncate font-mono text-[11px] font-medium text-white/90 sm:max-w-[180px] sm:text-xs">
                {user.name && !user.name.includes('@') ? user.name : user.email.split('@')[0]}
              </span>
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
    </header>
  );
};
