import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import {
  analyzeAudit,
  extractSampleContract,
  fetchAuditById,
  fetchMyAudits,
} from './api/client';
import { AuthModal } from './components/AuthModal';
import { ContractBuilderView } from './components/ContractBuilderView';
import { DonationModal } from './components/DonationModal';
import { LiveClauseSpecimen } from './components/LiveClauseSpecimen';
import { Navbar, WorkspaceMode } from './components/Navbar';
import { ResultsView } from './components/ResultsView';
import { SowReconciliationView } from './components/SowReconciliationView';
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

const MARQUEE_ITEMS_EN = [
  'PAYMENT TERMS',
  'IP RIGHTS',
  'LIABILITY',
  'SCOPE CREEP',
  'TERMINATION',
  'NON-COMPETE',
  'GOVERNING LAW',
];

const MARQUEE_ITEMS_UK = [
  'УМОВИ ОПЛАТИ',
  'ПРАВА IP',
  'ВІДПОВІДАЛЬНІСТЬ',
  'РОЗМИТТЯ СКОУПУ',
  'РОЗІРВАННЯ',
  'NON-COMPETE',
  'ЗАСТОСОВНЕ ПРАВО',
];

const MainShell: React.FC = () => {
  const { t, lang } = useLanguage();
  const { user, token } = useAuth();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const isUk = lang === 'uk';

  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'signup' }>({
    open: false,
    mode: 'login',
  });
  const [donateOpen, setDonateOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<AuditExtractionRecord | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditLoadError, setAuditLoadError] = useState(false);
  const [recentAudits, setRecentAudits] = useState<AuditSummaryItem[]>([]);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('auditor');
  const [builderTemplateOverride] = useState<string | undefined>(undefined);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetToUpload = () => {
    setActiveRecord(null);
    setAuditLoadError(false);
    setWorkspaceMode('auditor');
    if (window.location.search || window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToWorkspaceCard = () => {
    window.requestAnimationFrame(() => {
      const el = document.getElementById('workspace-card-top');
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 16;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }
    });
  };

  const jumpToMode = (mode: WorkspaceMode) => {
    setActiveRecord(null);
    setAuditLoadError(false);
    setWorkspaceMode(mode);
    if (window.location.search || window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    scrollToWorkspaceCard();
  };

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (activeRecord) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else {
      scrollToWorkspaceCard();
    }
  }, [workspaceMode, activeRecord]);

  const handleRunLiveSample = async () => {
    setLoadingAudit(true);
    setAuditLoadError(false);
    try {
      const extracted = await extractSampleContract('01_Predatory_IT_MSA_EN.docx', token);
      const analyzed = await analyzeAudit(extracted.auditId, token);
      openRecord(analyzed);
    } catch {
      setAuditLoadError(true);
    } finally {
      setLoadingAudit(false);
    }
  };

  const marqueeWords = isUk ? MARQUEE_ITEMS_UK : MARQUEE_ITEMS_EN;

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-paper text-ink-primary">
      <Navbar
        activeMode={activeRecord ? 'auditor' : workspaceMode}
        onSelectMode={jumpToMode}
        onOpenAuth={(mode) => setAuthModal({ open: true, mode })}
        onOpenDonate={() => setDonateOpen(true)}
        showLandingAnchors={!activeRecord}
      />

      {loadingAudit ? (
        <main className="flex flex-1 items-center justify-center bg-paper px-4 py-20">
          <div className="flex items-center gap-3 rounded-xl border border-paper-border bg-white px-6 py-5 text-sm font-semibold text-ink-primary shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-signal" aria-hidden="true" />
            <span>{t.auditNotFound.loading}</span>
          </div>
        </main>
      ) : auditLoadError ? (
        <main className="flex-1 bg-paper px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-2xl rounded-xl border border-paper-border bg-white p-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-signal" aria-hidden="true" />
              <div>
                <h1 className="font-display text-2xl font-bold text-ink-primary">
                  {t.auditNotFound.title}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                  {t.auditNotFound.description}
                </p>
                <button
                  type="button"
                  onClick={resetToUpload}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-forest-soft"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>{t.auditNotFound.backBtn}</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      ) : activeRecord ? (
        <ResultsView
          record={activeRecord}
          onReset={resetToUpload}
          onOpenDonate={() => setDonateOpen(true)}
        />
      ) : (
        <main className="flex-1">
          {/* Dark Forest Hero Section (matching Image 2) */}
          <section className="bg-forest text-white">
            <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-signal">
                {isUk
                  ? 'ПЕРЕВІРКА ТА КОНСТРУКТОР ДОГОВОРІВ ДЛЯ ФОП'
                  : 'CONTRACT CHECK FOR FREELANCERS'}
              </p>

              <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div className="max-w-2xl">
                  <h1 className="font-display text-4xl font-extrabold leading-[1.03] tracking-tight text-white sm:text-5xl lg:text-[56px]">
                    {isUk ? (
                      <>
                        Підписуйте з
                        <br />
                        відкритими очима.
                      </>
                    ) : (
                      <>
                        Sign with your
                        <br />
                        eyes open.
                      </>
                    )}
                  </h1>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-forest-muted sm:text-base">
                    {isUk
                      ? 'Завантажте MSA, NDA чи SOW або зберіть договір з перевірених пунктів ФОП. За хвилину ви отримаєте рейтинг ризиків, пояснення простою мовою та готові формулювання для переговорів.'
                      : 'Upload an MSA, NDA or SOW — or assemble one from vetted FOP clauses. In about a minute you get every risky clause ranked, explained in plain words, with replacement wording you can send back.'}
                  </p>
                </div>

                {/* Workspace Mode Switcher Pills (Single proportional row on mobile & desktop) */}
                <div
                  ref={workspaceRef}
                  className="grid w-full grid-cols-3 items-center gap-1 rounded-full border border-forest-border bg-forest-deep p-1 sm:inline-flex sm:w-auto sm:shrink-0 sm:gap-1.5"
                >
                  {(
                    [
                      ['auditor', isUk ? 'Аудит договору' : 'Audit contract'],
                      ['reconcile', isUk ? 'Звірка з чатом' : 'Chat vs SOW'],
                      ['builder', isUk ? 'Зібрати договір' : 'Assemble contract'],
                    ] as const
                  ).map(([modeId, label]) => {
                    const active = workspaceMode === modeId;
                    return (
                      <button
                        key={modeId}
                        type="button"
                        onClick={() => setWorkspaceMode(modeId)}
                        className={`truncate rounded-full px-2 py-2 text-center text-[11px] font-semibold transition-colors sm:px-4 sm:py-1.5 sm:text-xs ${
                          active
                            ? 'bg-signal text-white'
                            : 'text-forest-muted hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hero Workspace Area */}
              {workspaceMode === 'auditor' ? (
                <div id="workspace-card-top" className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
                  {/* Left: White Upload Card */}
                  <div className="rounded-xl bg-white p-5 shadow-2xl shadow-black/25 sm:p-6 lg:col-span-6">
                    {user && recentAudits.length > 0 && (
                      <div className="mb-5 border-b border-paper-border pb-4">
                        <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                          {t.recentAudits.title}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recentAudits.slice(0, 4).map((item) => (
                            <button
                              key={item.auditId}
                              type="button"
                              onClick={() => void loadAuditFromId(item.auditId)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-paper-border bg-paper px-3 py-1 text-xs font-medium text-ink-primary hover:border-signal hover:text-signal"
                            >
                              <span className="max-w-[140px] truncate">{item.fileName}</span>
                              {item.overallRiskScore !== null && (
                                <span className="font-mono text-[10px] text-ink-muted">
                                  {item.overallRiskScore}/100
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <UploadZone onExtracted={openRecord} />
                  </div>

                  {/* Right: Immersive Interactive Sample Scan Card */}
                  <div className="lg:col-span-6 lg:pt-4">
                    <LiveClauseSpecimen onRunSample={() => void handleRunLiveSample()} />
                  </div>
                </div>
              ) : (
                <div id="workspace-card-top" className="mt-8 rounded-xl bg-white p-5 text-ink-primary shadow-2xl shadow-black/25 sm:p-7">
                  {workspaceMode === 'reconcile' ? (
                    <SowReconciliationView onOpenAuditRecord={openRecord} />
                  ) : (
                    <ContractBuilderView initialTemplateId={builderTemplateOverride} />
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Full-Width Signal Orange Marquee Ticker (matching Image 2) */}
          <div className="overflow-hidden bg-signal py-2.5 text-forest-deep">
            <div className="animate-cg-marquee font-mono text-xs font-bold tracking-widest">
              {[...marqueeWords, ...marqueeWords, ...marqueeWords].map((word, idx) => (
                <span key={idx} className="mx-3 inline-flex items-center gap-3 whitespace-nowrap">
                  <span>{word}</span>
                  <span aria-hidden="true">/</span>
                </span>
              ))}
            </div>
          </div>

          {/* Three steps, about a minute (Light Paper Section) */}
          <section id="how-it-works" className="bg-paper px-4 py-14 sm:px-6 sm:py-16">
            <div className="mx-auto max-w-6xl">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink-primary sm:text-3xl">
                {isUk ? 'Три кроки, близько хвилини' : 'Three steps, about a minute'}
              </h2>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                {(
                  [
                    [
                      '1',
                      isUk ? 'Завантажте' : 'Upload',
                      isUk
                        ? 'PDF, DOCX або контекст проєкту. Вкажіть свою сторону — Виконавець чи Замовник.'
                        : 'PDF, DOCX or project context. Say whether you are the contractor or the client.',
                    ],
                    [
                      '2',
                      isUk ? 'Прочитайте рейтинг' : 'Read the ranking',
                      isUk
                        ? 'Кожен пункт договору отримує рівень ризику, пояснення у двох реченнях та точну цитату.'
                        : 'Every clause gets a severity, a two-sentence summary and the exact words that worry us.',
                    ],
                    [
                      '3',
                      isUk ? 'Надішліть правки' : 'Push back',
                      isUk
                        ? 'Скопіюйте жорсткий, збалансований або м’який варіант правки й додайте у переговори.'
                        : 'Copy a firm, balanced or friendly counter-clause and send it with your comments.',
                    ],
                  ] as const
                ).map(([num, title, desc]) => (
                  <div
                    key={num}
                    className="rounded-xl border border-paper-border bg-white p-6 transition-colors hover:border-paper-strong"
                  >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-forest font-mono text-xs font-bold text-white">
                      {num}
                    </span>
                    <h3 className="mt-4 font-display text-base font-bold text-ink-primary">
                      {title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Dark Forest Privacy Section ("Your contract stays yours.") */}
          <section id="privacy" className="bg-forest px-4 py-14 text-white sm:px-6 sm:py-16">
            <div className="mx-auto max-w-6xl">
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {isUk ? 'Ваш договір залишається вашим.' : 'Your contract stays yours.'}
              </h2>

              <div className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <h3 className="font-mono text-xs font-semibold text-[#52C48A]">
                    {isUk ? 'Видалення за 24 години' : 'Deleted after 24 hours'}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-forest-muted">
                    {isUk
                      ? 'Завантажений файл та результати аналізу автоматично видаляються.'
                      : 'The file and the analysis are removed automatically.'}
                  </p>
                </div>
                <div>
                  <h3 className="font-mono text-xs font-semibold text-[#52C48A]">
                    {isUk ? 'Шифрування на сервері' : 'Encrypted at rest'}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-forest-muted">
                    {isUk
                      ? 'Файлове сховище та база даних зашифровані.'
                      : 'Storage and database are both encrypted.'}
                  </p>
                </div>
                <div>
                  <h3 className="font-mono text-xs font-semibold text-[#52C48A]">
                    {isUk ? 'Без тексту в логах' : 'No text in logs'}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-forest-muted">
                    {isUk
                      ? 'Текст вашого договору ніколи не записується у серверні логи.'
                      : 'Contract text is never written to our logs.'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Light Paper Footer with Support Bar */}
      <footer className="bg-paper px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-4">
          {!activeRecord && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-paper-border bg-white px-5 py-4">
              <p className="text-sm text-ink-secondary">
                <strong className="font-semibold text-ink-primary">ClauseGuard</strong>{' '}
                {isUk
                  ? 'безкоштовний. Якщо він вберіг вас від поганої угоди, підтримайте проєкт.'
                  : 'is free. If it saved you from a bad deal, you can chip in.'}
              </p>
              <button
                type="button"
                onClick={() => setDonateOpen(true)}
                className="rounded-full border border-paper-border bg-paper px-4 py-1.5 text-xs font-semibold text-ink-primary transition-colors hover:border-forest hover:bg-white"
              >
                {isUk ? 'Підтримати через Monobank' : 'Support via Monobank'}
              </button>
            </div>
          )}
          <p className="text-xs text-ink-muted">{t.disclaimerBanner}</p>
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
