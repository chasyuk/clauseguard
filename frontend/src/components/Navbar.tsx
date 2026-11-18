import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export type WorkspaceMode = 'builder' | 'auditor' | 'library';

interface NavbarProps {
  activeMode?: WorkspaceMode;
  onSelectMode?: (mode: WorkspaceMode) => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenDonate: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeMode,
  onSelectMode,
  onOpenAuth,
  onOpenDonate,
}) => {
  const { lang, setLang, t } = useLanguage();
  const { user, logout } = useAuth();

  const navItems: Array<[WorkspaceMode, string]> = [
    ['builder', lang === 'uk' ? 'Конструктор' : 'Builder'],
    ['auditor', lang === 'uk' ? 'Аудитор SOW' : 'SOW Auditor'],
    ['library', lang === 'uk' ? 'Шаблони' : 'Templates'],
  ];

  return (
    <header className="mx-auto w-full max-w-6xl px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="rounded-lg border border-surface-border bg-surface-card">
        <div className="flex h-14 items-center justify-between px-3 sm:px-4">
          {/* Left: Wordmark */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center gap-2 text-ink-primary transition-colors hover:text-white"
            >
              <span className="font-display text-base font-bold tracking-tight text-white sm:text-lg">
                {t.brand}
              </span>
            </a>
            <span className="hidden text-surface-strong lg:inline" aria-hidden="true">
              /
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-wider text-ink-muted lg:inline">
              {t.disclaimerBadge}
            </span>
          </div>

          {/* Center: Desktop nav links */}
          {onSelectMode && (
            <nav className="hidden items-center gap-1 md:flex" aria-label="Workspace switcher">
              {navItems.map(([modeId, label]) => {
                const active = activeMode === modeId;
                return (
                  <button
                    key={modeId}
                    type="button"
                    onClick={() => onSelectMode(modeId)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-surface-subtle text-white'
                        : 'text-ink-secondary hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right: Language, Donate, Auth */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div
              className="inline-flex rounded-md border border-surface-border bg-surface-bg p-0.5"
              role="group"
              aria-label="Language switcher"
            >
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`rounded-sm px-2 py-1 font-mono text-[11px] font-medium transition-colors ${
                  lang === 'en'
                    ? 'bg-surface-subtle text-white'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('uk')}
                className={`rounded-sm px-2 py-1 font-mono text-[11px] font-medium transition-colors ${
                  lang === 'uk'
                    ? 'bg-surface-subtle text-white'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                UA
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenDonate}
              className="hidden rounded-md border border-surface-border bg-surface-subtle px-3 py-1.5 text-xs font-medium text-ink-primary transition-colors hover:border-surface-strong hover:bg-surface-border sm:inline-flex"
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
                  className="rounded-md border border-surface-border bg-surface-subtle px-2.5 py-1.5 text-xs font-medium text-ink-primary transition-colors hover:border-surface-strong sm:px-3"
                >
                  {t.nav.signOut}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 border-l border-surface-border pl-1.5 sm:gap-1.5 sm:pl-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="rounded-md px-2 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:text-white sm:px-2.5"
                >
                  {t.nav.signIn}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0A0A0A] transition-colors hover:bg-zinc-200 sm:px-3.5"
                >
                  {t.nav.signUp}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Quick Nav Row */}
        {onSelectMode && (
          <div className="flex items-center justify-between gap-1 border-t border-surface-border px-2 py-1.5 md:hidden">
            <div className="flex flex-1 items-center gap-1">
              {navItems.map(([modeId, label]) => {
                const active = activeMode === modeId;
                return (
                  <button
                    key={modeId}
                    type="button"
                    onClick={() => onSelectMode(modeId)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors ${
                      active
                        ? 'bg-surface-subtle text-white'
                        : 'text-ink-secondary hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={onOpenDonate}
              className="shrink-0 rounded-md border border-surface-border bg-surface-bg px-2.5 py-1.5 text-[11px] font-medium text-ink-secondary sm:hidden"
            >
              {lang === 'uk' ? 'Донат' : 'Donate'}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
