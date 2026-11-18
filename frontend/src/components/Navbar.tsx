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
  activeMode,
  onSelectMode,
  onOpenAuth,
  onOpenDonate,
  showLandingAnchors = true,
}) => {
  const { lang, setLang, t } = useLanguage();
  const { user, logout } = useAuth();

  const navItems: Array<[WorkspaceMode, string]> = [
    ['auditor', lang === 'uk' ? 'Аудит' : 'Audit'],
    ['reconcile', lang === 'uk' ? 'Звірка з чатом' : 'Chat vs SOW'],
    ['builder', lang === 'uk' ? 'Зібрати договір' : 'Assemble'],
  ];

  return (
    <header className="w-full border-b border-forest-border bg-forest text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left: § clauseguard mark */}
        <a
          href="/"
          className="flex items-center gap-2.5 text-white transition-opacity hover:opacity-90"
        >
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-signal font-mono text-sm font-bold text-white"
            aria-hidden="true"
          >
            §
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">
            <span className="text-white">clause</span>
            <span className="text-signal">guard</span>
          </span>
        </a>

        {/* Center/Right navigation */}
        <div className="flex items-center gap-2 sm:gap-5">
          {onSelectMode && (
            <nav className="hidden items-center gap-1 md:flex" aria-label="Workspace modes">
              {navItems.map(([modeId, label]) => {
                const active = activeMode === modeId;
                return (
                  <button
                    key={modeId}
                    type="button"
                    onClick={() => onSelectMode(modeId)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-forest-soft text-white'
                        : 'text-forest-muted hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>
          )}

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

          {/* UA / EN pill toggle matching template */}
          <div
            className="inline-flex items-center rounded-full border border-forest-border bg-forest-deep p-0.5"
            role="group"
            aria-label="Language switcher"
          >
            <button
              type="button"
              onClick={() => setLang('uk')}
              className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors ${
                lang === 'uk' ? 'bg-white text-forest' : 'text-forest-muted hover:text-white'
              }`}
            >
              UA
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors ${
                lang === 'en' ? 'bg-white text-forest' : 'text-forest-muted hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenDonate}
            className="hidden rounded-full border border-forest-border px-3 py-1.5 text-xs font-medium text-forest-muted transition-colors hover:border-white/40 hover:text-white sm:inline-flex"
          >
            {t.nav.donate}
          </button>

          {user ? (
            <div className="flex items-center gap-2 border-l border-forest-border pl-2.5">
              <span className="hidden max-w-[180px] truncate font-mono text-xs font-medium text-white/90 sm:inline">
                {user.name && !user.name.includes('@') ? user.name : user.email.split('@')[0]}
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-forest-border px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-forest-soft"
              >
                {t.nav.signOut}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 border-l border-forest-border pl-2.5">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="rounded-full px-2.5 py-1.5 text-xs font-medium text-forest-muted transition-colors hover:text-white"
              >
                {t.nav.signIn}
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="rounded-full bg-signal px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-signal-hover"
              >
                {t.nav.signUp}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile quick mode switcher */}
      {onSelectMode && (
        <div className="flex items-center gap-1 border-t border-forest-border bg-forest-deep px-3 py-2 md:hidden">
          {navItems.map(([modeId, label]) => {
            const active = activeMode === modeId;
            return (
              <button
                key={modeId}
                type="button"
                onClick={() => onSelectMode(modeId)}
                className={`flex-1 rounded-full px-2 py-1.5 text-center text-xs font-semibold transition-colors ${
                  active ? 'bg-white text-forest' : 'text-forest-muted hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
