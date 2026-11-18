import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { fetchAuditById, fetchMyAudits } from './api/client';
import { AuthModal } from './components/AuthModal';
import { ClauseLibraryView } from './components/ClauseLibraryView';
import { ContractBuilderView } from './components/ContractBuilderView';
import { DonationModal } from './components/DonationModal';
import { LiveClauseSpecimen } from './components/LiveClauseSpecimen';
import { Navbar, WorkspaceMode } from './components/Navbar';
import { ResultsView } from './components/ResultsView';
import { UploadZone } from './components/UploadZone';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AuditExtractionRecord, AuditSummaryItem } from './types';

function readAuditIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const queryId = params.get('audit');
  if (queryId) return queryId;

  const pathMatch = window.location.pathname.match(/^\/audits\/([^/]+)$/);
  return pathMatch ? decodeURIComponent(pathMatch[1]) : null;
}

const MainShell: React.FC = () => {
  const { t, lang } = useLanguage();
  const { user, token } = useAuth();
  const workspaceRef = useRef<HTMLDivElement>(null);

  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'signup' }>({
    open: false,
    mode: 'login',
  });
  const [donateOpen, setDonateOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<AuditExtractionRecord | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditLoadError, setAuditLoadError] = useState(false);
  const [recentAudits, setRecentAudits] = useState<AuditSummaryItem[]>([]);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('builder');
  const [builderTemplateOverride, setBuilderTemplateOverride] = useState<string | undefined>(
    undefined,
  );

  const loadAuditFromId = async (auditId: string) => {
    setLoadingAudit(true);
    setAuditLoadError(false);
    try {
      const record = await fetchAuditById(auditId);
      setActiveRecord(record);
    } catch {
      setActiveRecord(null);
      setAuditLoadError(true);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    const urlAuditId = readAuditIdFromUrl();
    if (urlAuditId) {
      void loadAuditFromId(urlAuditId);
    }

    const onPopState = () => {
      const nextId = readAuditIdFromUrl();
      if (nextId) {
        void loadAuditFromId(nextId);
      } else {
        setActiveRecord(null);
        setAuditLoadError(false);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!token || !user) {
      setRecentAudits([]);
      return;
    }
    fetchMyAudits(token)
      .then(setRecentAudits)
      .catch(() => setRecentAudits([]));
  }, [token, user, activeRecord]);

  const openRecord = (record: AuditExtractionRecord) => {
    setActiveRecord(record);
    setAuditLoadError(false);
    const targetUrl = `/?audit=${encodeURIComponent(record.auditId)}`;
    if (window.location.search !== `?audit=${encodeURIComponent(record.auditId)}`) {
      window.history.pushState({}, '', targetUrl);
    }
  };

  const resetToUpload = () => {
    setActiveRecord(null);
    setAuditLoadError(false);
    setWorkspaceMode('auditor');
    if (window.location.search || window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
  };

  const jumpToMode = (mode: WorkspaceMode) => {
    setActiveRecord(null);
    setAuditLoadError(false);
    setWorkspaceMode(mode);
    if (window.location.search || window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    window.setTimeout(() => {
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  };

  const isUk = lang === 'uk';

  return (
    <div className="flex min-h-screen flex-col bg-surface-bg text-ink-primary">
      <Navbar
        activeMode={activeRecord ? 'auditor' : workspaceMode}
        onSelectMode={jumpToMode}
        onOpenAuth={(mode) => setAuthModal({ open: true, mode })}
        onOpenDonate={() => setDonateOpen(true)}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        {loadingAudit ? (
          <div className="flex items-center justify-center rounded-lg border border-surface-border bg-surface-card p-12 text-sm font-medium text-brand-text">
            <Loader2 className="mr-2.5 h-5 w-5 animate-spin" aria-hidden="true" />
            <span>{t.auditNotFound.loading}</span>
          </div>
        ) : auditLoadError ? (
          <div className="rounded-lg border border-surface-border bg-surface-card p-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-risk-highText" aria-hidden="true" />
              <div>
                <h1 className="font-display text-xl font-bold text-white">
                  {t.auditNotFound.title}
                </h1>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-secondary">
                  {t.auditNotFound.description}
                </p>
                <button
                  type="button"
                  onClick={resetToUpload}
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-xs font-semibold text-[#0A0A0A] transition-colors hover:bg-zinc-200"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.auditNotFound.backBtn}</span>
                </button>
              </div>
            </div>
          </div>
        ) : !activeRecord ? (
          <div className="space-y-12">
            {/* Cal.com v7 Reference Centered Hero */}
            <section className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-md border border-surface-border bg-surface-card px-2.5 py-1 text-xs">
                <span className="rounded-sm bg-surface-subtle px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-brand-text">
                  FOP 3
                </span>
                <span className="text-ink-secondary">
                  {isUk
                    ? '16 перевірених модулів · Контекстний аудит SOW'
                    : '16 vetted B2B modules · Context-aware SOW audit'}
                </span>
              </div>

              <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[54px]">
                {isUk ? (
                  <>
                    Де{' '}
                    <span className="mx-1 inline-flex items-center rounded-md border border-surface-strong bg-surface-card px-2.5 py-1 align-middle font-mono text-sm font-semibold text-white sm:text-base">
                      VETTED-16
                    </span>{' '}
                    договори
                    <br className="hidden sm:inline" /> фіксують{' '}
                    <span className="mx-1 inline-flex items-center gap-1.5 rounded-md border border-risk-lowBorder bg-risk-lowBg px-2.5 py-1 align-middle font-mono text-xs font-semibold text-risk-lowText sm:text-sm">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Скоуп OK</span>
                    </span>{' '}
                    реальні умови
                  </>
                ) : (
                  <>
                    Where{' '}
                    <span className="mx-1 inline-flex items-center rounded-md border border-surface-strong bg-surface-card px-2.5 py-1 align-middle font-mono text-sm font-semibold text-white sm:text-base">
                      VETTED-16
                    </span>{' '}
                    contracts
                    <br className="hidden sm:inline" /> match{' '}
                    <span className="mx-1 inline-flex items-center gap-1.5 rounded-md border border-risk-lowBorder bg-risk-lowBg px-2.5 py-1 align-middle font-mono text-xs font-semibold text-risk-lowText sm:text-sm">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Scope OK</span>
                    </span>{' '}
                    what you agreed
                  </>
                )}
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-secondary sm:text-base">
                {t.workspace.subtitle}
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => jumpToMode('builder')}
                  className="inline-flex items-center justify-center rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-zinc-200"
                >
                  {isUk ? 'Скласти договір з модулів' : 'Build contract from vetted clauses'}
                </button>
                <button
                  type="button"
                  onClick={() => jumpToMode('auditor')}
                  className="inline-flex items-center justify-center rounded-md border border-surface-border bg-surface-card px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-surface-strong hover:bg-surface-subtle"
                >
                  {isUk ? 'Звірити SOW із контекстом' : 'Audit SOW against project context'}
                </button>
              </div>

              <p className="mt-3 font-mono text-[11px] text-ink-muted">
                {isUk
                  ? '100% безкоштовно · Без картки та paywall · Автовидалення через 24 год'
                  : '100% free · No credit card or paywall · Files auto-delete in 24h'}
              </p>
            </section>

            {/* Cal.com-Style Embedded Product Window Frame */}
            <section
              ref={workspaceRef}
              className="overflow-hidden rounded-lg border border-surface-border bg-surface-card"
            >
              {/* Subtle macOS Window Chrome */}
              <div className="flex h-10 items-center justify-between border-b border-surface-border bg-surface-subtle px-4">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#EF4444]/80" />
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#F59E0B]/80" />
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#22C55E]/80" />
                </div>
                <span className="rounded-sm border border-surface-border bg-surface-bg px-3 py-0.5 font-mono text-[11px] text-ink-muted">
                  clauseguard.app/{workspaceMode}
                </span>
                <span className="hidden font-mono text-[10px] text-ink-muted sm:inline">
                  {t.disclaimerBadge}
                </span>
              </div>

              {/* Mode Switcher Bar Inside App Window */}
              <nav
                aria-label="Workspace modes"
                className="grid grid-cols-1 border-b border-surface-border bg-surface-bg sm:grid-cols-3"
              >
                {(
                  [
                    ['builder', t.modes.builder],
                    ['auditor', t.modes.auditor],
                    ['library', t.modes.library],
                  ] as const
                ).map(([modeId, label]) => {
                  const active = workspaceMode === modeId;
                  return (
                    <button
                      key={modeId}
                      type="button"
                      onClick={() => setWorkspaceMode(modeId)}
                      className={`border-b border-surface-border px-4 py-3 text-left font-mono text-xs font-semibold transition-colors sm:border-b-0 sm:border-r last:border-b-0 last:border-r-0 ${
                        active
                          ? 'border-b-2 border-b-brand bg-surface-card text-white sm:border-b-0 sm:bg-surface-subtle'
                          : 'text-ink-muted hover:bg-surface-card hover:text-ink-primary'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </nav>

              {/* Active App Content */}
              <div className="bg-surface-bg p-4 sm:p-6">
                {workspaceMode === 'builder' ? (
                  <ContractBuilderView initialTemplateId={builderTemplateOverride} />
                ) : workspaceMode === 'library' ? (
                  <ClauseLibraryView
                    onUseTemplate={(tplId) => {
                      setBuilderTemplateOverride(tplId);
                      setWorkspaceMode('builder');
                    }}
                  />
                ) : (
                  <div className="space-y-8">
                    {user && recentAudits.length > 0 && (
                      <section className="overflow-hidden rounded-lg border border-surface-border bg-surface-card">
                        <div className="border-b border-surface-border bg-surface-subtle px-4 py-2.5">
                          <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
                            {t.recentAudits.title}
                          </h2>
                        </div>
                        <div className="divide-y divide-surface-border">
                          {recentAudits.slice(0, 5).map((item) => (
                            <div
                              key={item.auditId}
                              className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5"
                            >
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-medium text-white">
                                  {item.fileName}
                                </span>
                                {item.overallRiskScore !== null && (
                                  <span className="rounded-sm border border-surface-border bg-surface-bg px-2 py-0.5 font-mono text-xs font-semibold text-ink-secondary">
                                    {t.recentAudits.scorePrefix}: {item.overallRiskScore}/100
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => void loadAuditFromId(item.auditId)}
                                className="rounded-md border border-surface-border bg-surface-subtle px-3 py-1 text-xs font-medium text-white transition-colors hover:border-surface-strong"
                              >
                                {t.recentAudits.openBtn}
                              </button>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    <UploadZone onExtracted={openRecord} />
                    <LiveClauseSpecimen />
                  </div>
                )}
              </div>
            </section>

            {/* Architectural Differentiation Strip */}
            <section className="space-y-3">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                {t.differentiator.heading}
              </p>
              <div className="grid grid-cols-1 divide-y divide-surface-border overflow-hidden rounded-lg border border-surface-border bg-surface-card md:grid-cols-3 md:divide-x md:divide-y-0">
                {t.differentiator.cards.map((card) => (
                  <div key={card.tag} className="p-5">
                    <span className="inline-block rounded-sm border border-brand/50 bg-brand-subtle px-2 py-0.5 font-mono text-[10px] font-semibold text-brand-text">
                      {card.tag}
                    </span>
                    <h2 className="mt-3 font-display text-base font-bold text-white">
                      {card.title}
                    </h2>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
                      {card.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <ResultsView
            record={activeRecord}
            onReset={resetToUpload}
            onOpenDonate={() => setDonateOpen(true)}
          />
        )}
      </main>

      <footer className="border-t border-surface-border bg-surface-card">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-ink-muted sm:px-6">
          {t.disclaimerBanner}
        </div>
      </footer>

      <AuthModal
        isOpen={authModal.open}
        initialMode={authModal.mode}
        onClose={() => setAuthModal((prev) => ({ ...prev, open: false }))}
      />

      <DonationModal isOpen={donateOpen} onClose={() => setDonateOpen(false)} />
    </div>
  );
};

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainShell />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
