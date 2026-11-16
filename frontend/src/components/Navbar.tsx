import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface NavbarProps {
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenDonate: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, onOpenDonate }) => {
  const { lang, setLang, t } = useLanguage();
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-surface-strong bg-surface-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-2 text-ink-primary transition-colors hover:text-brand"
          >
            <span className="border border-surface-strong bg-brand px-1.5 py-0.5 font-mono text-xs font-semibold text-white">
              §
            </span>
            <span className="font-serif text-lg font-semibold tracking-tight">{t.brand}</span>
          </a>
          <span className="hidden text-surface-border sm:inline" aria-hidden="true">
            /
          </span>
          <span className="hidden font-mono text-[11px] font-medium uppercase tracking-wider text-ink-muted sm:inline">
            {t.disclaimerBadge}
          </span>
        </div>

        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Primary navigation">
          <div
            className="inline-flex border border-surface-strong bg-surface-bg"
            role="group"
            aria-label="Language switcher"
          >
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors ${
                lang === 'en'
                  ? 'bg-surface-strong text-white'
                  : 'text-ink-secondary hover:bg-surface-subtle'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('uk')}
              className={`px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors ${
                lang === 'uk'
                  ? 'bg-surface-strong text-white'
                  : 'text-ink-secondary hover:bg-surface-subtle'
              }`}
            >
              UA
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenDonate}
            className="border border-surface-border bg-surface-bg px-3 py-1.5 text-xs font-medium text-ink-primary transition-colors hover:border-surface-strong"
          >
            {t.nav.donate}
          </button>

          {user ? (
            <div className="flex items-center gap-2 border-l border-surface-border pl-2">
              <span className="hidden font-mono text-xs text-ink-secondary sm:inline">
                {user.email}
              </span>
              <button
                type="button"
                onClick={logout}
                className="border border-surface-border bg-surface-subtle px-3 py-1.5 text-xs font-medium text-ink-primary transition-colors hover:border-surface-strong"
              >
                {t.nav.signOut}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 border-l border-surface-border pl-2">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:text-ink-primary"
              >
                {t.nav.signIn}
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="border border-brand bg-brand px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-hover"
              >
                {t.nav.signUp}
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
