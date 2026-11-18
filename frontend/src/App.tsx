import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
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

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-8 sm:px-6 sm:pt-12">
        {loadingAudit ? (
          <div className="flex items-center justify-center rounded-lg border border-surface-border bg-surface-card p-12 text-base font-medium text-white">
            <Loader2 className="mr-3 h-5 w-5 animate-spin text-brand-text" aria-hidden="true" />
            <span>{t.auditNotFound.loading}</span>
          </div>
        ) : auditLoadError ? (
          <div className="rounded-lg border border-surface-border bg-surface-card p-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-risk-highText" aria-hidden="true" />
              <div>
                <h1 className="font-display text-2xl font-bold text-white">
                  {t.auditNotFound.title}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-secondary">
                  {t.auditNotFound.description}
                </p>
                <button
                  type="button"
                  onClick={resetToUpload}
                  className="mt-5 inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-zinc-200"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>{t.auditNotFound.backBtn}</span>
                </button>
              </div>
            </div>
          </div>
        ) : !activeRecord ? (
          <div className="space-y-10">
            {/* Cal.com v7 Reference Centered Hero */}
            <section className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-md border border-surface-border bg-surface-card px-3 py-1 text-xs">
                <span className="h-2 w-2 animate-pulse rounded-sm bg-[#22C55E]" aria-hidden="true" />
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-white">
                  FOP 3
                </span>
                <span className="text-ink-secondary">
                  {isUk
                    ? '16 перевірених модулів · Контекстна звірка SOW'
                    : '16 vetted B2B clauses · SOW context audit'}
                </span>
              </div>

              <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.04] tracking-[-0.035em] text-white sm:text-6xl lg:text-[66px]">
                {isUk ? (
                  <>
                    Де договори фіксують
                    <br className="hidden sm:inline" /> реальні умови проєкту
                  </>
                ) : (
                  <>
                    Where contracts
                    <br className="hidden sm:inline" /> match what you agreed
                  </>
                )}
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-secondary sm:text-lg">
                {isUk
                  ? 'Опишіть умови простим текстом — система збере договір з перевірених пунктів ФОП або звірить SOW замовника з вашим реальним скоупом та дедлайнами.'
                  : 'Describe your deal in plain text to assemble a contract from 16 vetted FOP clauses, or reconcile a client SOW against what you actually agreed.'}
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => jumpToMode('builder')}
                  className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-zinc-200"
                >
                  {isUk ? 'Скласти договір з модулів' : 'Build contract from vetted clauses'}
                </button>
                <button
                  type="button"
                  onClick={() => jumpToMode('auditor')}
                  className="inline-flex items-center justify-center rounded-md border border-surface-border bg-surface-card px-6 py-3 text-sm font-medium text-white transition-colors hover:border-surface-strong hover:bg-surface-subtle"
                >
                  {isUk ? 'Звірити SOW із контекстом' : 'Audit SOW against project context'}
                </button>
              </div>

              <p className="mt-3 text-xs text-ink-muted">
                {isUk
                  ? 'Безкоштовно без paywall · Автоматичне видалення завантажених файлів через 24 год'
                  : '100% free · No credit card or paywall · Uploaded files auto-delete in 24h'}
              </p>
            </section>

            {/* Cal.com-Style Embedded Product Window Frame */}
            <section
              ref={workspaceRef}
              className="overflow-hidden rounded-lg border border-surface-border bg-surface-card"
            >
              {/* macOS Window Chrome + Integrated Mode Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border bg-surface-subtle px-4 py-2.5">
                <div className="flex items-center gap-2" aria-hidden="true">
                  <span className="h-3 w-3 rounded-sm bg-[#EF4444]/85" />
                  <span className="h-3 w-3 rounded-sm bg-[#F59E0B]/85" />
                  <span className="h-3 w-3 rounded-sm bg-[#22C55E]/85" />
                </div>

                <nav aria-label="Workspace modes" className="flex flex-wrap items-center gap-1">
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
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                          active
                            ? 'bg-white text-[#0A0A0A]'
                            : 'text-ink-secondary hover:bg-surface-card hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </nav>

                <span className="hidden font-mono text-[11px] text-ink-muted lg:inline">
                  {t.disclaimerBadge}
                </span>
              </div>

              {/* Active App Content */}
              <div className="bg-surface-bg p-5 sm:p-7">
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
                      <div className="border-b border-surface-border pb-6">
                        <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted">
                          {t.recentAudits.title}
                        </h2>
                        <div className="divide-y divide-surface-border overflow-hidden rounded-md border border-surface-border bg-surface-card">
                          {recentAudits.slice(0, 5).map((item) => (
                            <div
                              key={item.auditId}
                              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
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
                                className="rounded-md border border-surface-border bg-surface-subtle px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-surface-strong"
                              >
                                {t.recentAudits.openBtn}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <UploadZone onExtracted={openRecord} />
                    <LiveClauseSpecimen />
                  </div>
                )}
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

      <footer className="border-t border-surface-border bg-surface-bg">
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
